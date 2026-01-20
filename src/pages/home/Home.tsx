import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Zap, Layout, } from "lucide-react";
import { NavLink, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/utils/toast";
import StatsSection from "@/pages/home/stats-section"; // Yeni oluşturduğun bento-grid stats
import HomeLastMonthTopResults from "./ui/home-last-month-top-results";
import HeroSection from "./ui/hero-section"; // Yeni oluşturduğun hero
import HomeTestimonials from "./ui/home-testimonials";
import HomePricing from "./ui/home-pricing";
import HomeFAQ from "./ui/home-faq";
import { BannerSection } from "@/components/banner";
import { bannerService } from "@/services/banner.service";

export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  // Prevent multiple OAuth login attempts
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const processedTokenRef = useRef<string | null>(null);

  // Check if there are active banners
  const [hasActiveBanners, setHasActiveBanners] = useState(false);

  // Handle OAuth tokens
  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const error = searchParams.get("error");

    if (error && !isProcessingOAuth) {
      toast.error("Google ile giriş başarısız: " + error);
      navigate("/", { replace: true });
      return;
    }

    if (accessToken && !isProcessingOAuth && processedTokenRef.current !== accessToken) {
      setIsProcessingOAuth(true);
      processedTokenRef.current = accessToken;

      const handleOAuthLogin = async () => {
        try {
          await login(accessToken, refreshToken || undefined);
          toast.success("Google ile giriş başarılı!");
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
    <div className="bg-white text-gray-900">
      {/* Hero Section */}
      <HeroSection />

      {/* Stats Section (Bento Grid) */}
      <StatsSection />

      {/* ADVANTAGES SECTION */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Neden TURKISHMOCK?
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed font-normal">
              Türkçe seviyeni doğru, hızlı ve güvenilir şekilde ölçmek için tasarlanmış yapay zekâ destekli sınav platformu.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Card 1: Shield */}
            <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 transition-all duration-300 hover:bg-white hover:shadow-xl hover:border-red-100 hover:-translate-y-1 group">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:bg-red-600 transition-colors duration-300">
                <ShieldCheck className="w-8 h-8 text-red-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors">
                Gerçeğe En Yakın Deneyim
              </h3>
              <p className="text-gray-500 leading-relaxed font-medium">
                CEFR standartlarına uyumlu testler ile gerçek sınavı tam olarak simüle edin ve sürprizlerle karşılaşmayın.
              </p>
            </div>

            {/* Card 2: Zap */}
            <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 transition-all duration-300 hover:bg-white hover:shadow-xl hover:border-red-100 hover:-translate-y-1 group">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:bg-red-600 transition-colors duration-300">
                <Zap className="w-8 h-8 text-red-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors">
                Anında ve Güvenilir Sonuç
              </h3>
              <p className="text-gray-500 leading-relaxed font-medium">
                Testi tamamladığınız anda seviyeniz, puanınız ve detaylı analiz raporunuz saniyeler içinde ekranınızda.
              </p>
            </div>

            {/* Card 3: Layout */}
            <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 transition-all duration-300 hover:bg-white hover:shadow-xl hover:border-red-100 hover:-translate-y-1 group">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:bg-red-600 transition-colors duration-300">
                <Layout className="w-8 h-8 text-red-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors">
                Sade ve Odaklı Tasarım
              </h3>
              <p className="text-gray-500 leading-relaxed font-medium">
                Gereksiz hiçbir şey yok. Sadece akıcı, net ve profesyonel bir sınav deneyimi yaşamanız için tasarlandı.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials */}
      <HomeTestimonials />

      {/* Last 30 Days Results */}
      <HomeLastMonthTopResults />

      {/* FAQ Section */}
      <HomeFAQ />

      {/* Banner before Pricing */}
      {hasActiveBanners && <BannerSection position="top" className="py-8" />}

      {/* Pricing */}
      <HomePricing />

      {/* CTA Section (Red Background) */}
      <section className="py-24 bg-red-600 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
            Türkçe Seviyenizi Öğrenmeye <br/> Hazır mısınız?
          </h2>
          <p className="text-lg sm:text-xl text-red-100 mb-12 font-medium leading-relaxed max-w-2xl mx-auto">
            Binlerce kullanıcının güvendiği platformda Türkçe dil yeterlilik testinizi hemen başlatın.
          </p>

          <NavLink to="/test">
            <Button
              size="lg"
              className="group bg-white text-red-600 hover:bg-gray-50 px-12 py-8 text-lg font-bold shadow-2xl hover:shadow-white/20 rounded-full transition-all duration-300 hover:-translate-y-1"
            >
              Teste Başla
              <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </NavLink>
        </div>
      </section>
    </div>
  );
}
