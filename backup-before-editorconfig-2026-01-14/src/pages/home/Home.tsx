import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Zap, Layout } from "lucide-react";
import { NavLink, useSearchParams, useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/utils/toast";
import StatsSection from "@/pages/home/stats-section";
import HomeLastMonthTopResults from "./ui/home-last-month-top-results";
import HeroSection from "./ui/hero-section";
// import HomeSampleQuestionPreview from "./ui/home-sample-question-preview";
import HomeTestimonials from "./ui/home-testimonials";
import HomePricing from "./ui/home-pricing";
import HomeFAQ from "./ui/home-faq";
import { BannerSection } from "@/components/banner";
import { bannerService } from "@/services/banner.service";

// Telegram config must come from env for security

export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  // Prevent multiple OAuth login attempts
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const processedTokenRef = useRef<string | null>(null);
  
  // Check if there are active banners
  const [hasActiveBanners, setHasActiveBanners] = useState(false);

  // Handle OAuth tokens if they appear in home URL (backend issue workaround)
  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const error = searchParams.get("error");

    // Handle error case
    if (error && !isProcessingOAuth) {
      toast.error("Google ile giriş başarısız: " + error);
      // Clean URL
      navigate("/", { replace: true });
      return;
    }

    // Handle successful OAuth login
    if (
      accessToken &&
      !isProcessingOAuth &&
      processedTokenRef.current !== accessToken
    ) {
      setIsProcessingOAuth(true);
      processedTokenRef.current = accessToken;

      // Handle login using auth context
      const handleOAuthLogin = async () => {
        try {
          console.log(
            "Processing OAuth login with token:",
            accessToken.substring(0, 10) + "..."
          );
          await login(accessToken, refreshToken || undefined);
          toast.success("Google ile giriş başarılı!");
          // Clean URL by removing query parameters
          navigate("/", { replace: true });
        } catch (error) {
          console.error("OAuth login error:", error);
          toast.error("Giriş sırasında bir hata oluştu");
          navigate("/", { replace: true });
        } finally {
          setIsProcessingOAuth(false);
        }
      };

      handleOAuthLogin();
    }
  }, [searchParams, navigate, login, isProcessingOAuth]);

  // Check for active banners
  useEffect(() => {
    const checkActiveBanners = async () => {
      try {
        const allBanners = await bannerService.getAllBanners();
        const activeBanners = allBanners.filter(banner => {
          const isActive = banner.isActive !== false;
          const now = new Date();
          const startDate = banner.startDate ? new Date(banner.startDate) : null;
          const endDate = banner.endDate ? new Date(banner.endDate) : null;
          
          if (startDate && now < startDate) return false;
          if (endDate && now > endDate) return false;
          
          return isActive;
        });
        
        setHasActiveBanners(activeBanners.length > 0);
      } catch (error) {
        setHasActiveBanners(false);
      }
    };
    
    checkActiveBanners();
  }, []);

  return (
    <div className="bg-white">
      <HeroSection />

      <StatsSection />

      {/* ADVANTAGES SECTION */}
      <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Neden TURKISHMOCK?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed font-light">
              Türkçe seviyeni doğru, hızlı ve güvenilir şekilde ölçmek için tasarlanmış yapay zekâ destekli sınav platformu
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="p-8 bg-white rounded-2xl border border-gray-100 card-hover group">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                Gerçeğe En Yakın Sınav Deneyimi
              </h3>
              <p className="text-base text-gray-600 leading-relaxed">
                CEFR standartlarına uyumlu testler ile gerçek sınavı tam olarak simüle edin
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-8 bg-white rounded-2xl border border-gray-100 card-hover group">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                Anında ve Güvenilir Sonuç
              </h3>
              <p className="text-base text-gray-600 leading-relaxed">
                Testi tamamladığınız anda seviyeniz, puanınız ve detaylı analiz raporunuz hazır olur
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-8 bg-white rounded-2xl border border-gray-100 card-hover group md:col-span-2 lg:col-span-1">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Layout className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                Sade ve Odaklı Tasarım
              </h3>
              <p className="text-base text-gray-600 leading-relaxed">
                Gereksiz hiçbir şey yok. Sadece akıcı, net ve profesyonel bir sınav deneyimi yaşayın
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Questions Preview */}
      {/* <HomeSampleQuestionPreview /> */}

      {/* How it Works */}

      {/* Who is this for */}

      {/* Testimonials */}
      <HomeTestimonials />

      {/* Last 30 Days Results */}
      <HomeLastMonthTopResults />

      {/* FAQ Section */}
      <HomeFAQ />

      {/* Banner before Pricing - only show if there are active banners */}
      {hasActiveBanners && <BannerSection position="top" className="py-8" />}

      {/* Pricing */}
      <HomePricing />

      {/* Progress preview for logged-in users */}
      {/* <HomeProgressPreview /> */}

      {/* CTA Section */}
      <section className="py-24 sm:py-28 bg-gradient-to-br from-red-600 via-red-600 to-red-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Türkçe Seviyenizi Öğrenmeye Hazır mısınız?
          </h2>
          <p className="text-xl sm:text-2xl text-red-50 mb-12 font-light leading-relaxed">
            Binlerce kullanıcının güvendiği platformda Türkçe dil yeterlilik testinizi hemen başlatın
          </p>

          <NavLink to="/test">
            <Button
              size="lg"
              className="bg-white text-red-600 hover:bg-gray-50 px-10 py-6 text-lg font-semibold shadow-xl hover:shadow-2xl rounded-lg"
            >
              Teste Başla
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </NavLink>
        </div>
      </section>

      {/* Footer */}
    </div>
  );
}
