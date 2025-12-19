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
    <div className=" bg-white">
      <HeroSection />

      <StatsSection />

      {/* ADVANTAGES SECTION */}
      <section className="py-16 sm:py-20 md:py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 md:mb-20">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              Neden TURKISHMOCK?
            </h2>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-light">
              Türkçe seviyeni doğru, hızlı ve güvenilir şekilde ölçmek için tasarlanmış yapay zekâ destekli sınav platformu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Card 1 */}
            <div className="p-6 sm:p-8 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                Gerçeğe En Yakın Sınav Deneyimi
              </h3>
              <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
                CEFR standartlarına bire bir uyumlu testler ile gerçek sınavı tam olarak simüle edin.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 sm:p-8 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-red-600/5 rounded-bl-full -z-10"></div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <Zap className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                Anında ve Güvenilir Sonuç
              </h3>
              <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
                Testi tamamladığınız anda seviyeniz, puanınız ve detaylı analiz raporunuz hazır olur.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 sm:p-8 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 md:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <Layout className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                Sade ve Odaklı Tasarım
              </h3>
              <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
                Gereksiz hiçbir şey yok. Sadece akıcı, net ve profesyonel bir sınav deneyimi yaşayın.
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
      <section className="py-24 bg-gradient-to-r from-red-600 to-red-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Türkçe Seviyenizi Öğrenmeye Hazır mısınız?
          </h2>
          <p className="text-xl text-red-100 mb-12">
            Binlerce kullanıcının güvendiği platformda Türkçe dil yeterlilik
            testinizi hemen başlatın.
          </p>

          <NavLink to="/test">
            <Button
              size="lg"
              className="bg-white text-red-600 hover:bg-gray-100 px-8 py-4 text-lg shadow-lg"
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
