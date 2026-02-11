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
import HomeExpertOpinions from "./ui/home-expert-opinions";
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
    <div className="bg-white text-gray-900 font-sans">
      {/* Hero Section */}
      <HeroSection />

      {/* Stats Section (Bento Grid) */}
      <StatsSection />

      

      {/* Expert Opinions */}
      <HomeExpertOpinions />

      {/* ADVANTAGES SECTION */}
      <section className="py-16 sm:py-20 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="max-w-4xl mx-auto mb-12 text-center">
            <h2 className="text-xl sm:text-3xl font-semibold text-gray-900 mb-3 tracking-tight">
              Neden TURKISHMOCK?
            </h2>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Türkçe seviyeni hızlı ve güvenilir şekilde ölçen akıllı sınav platformu.
            </p>
          </div>

          {/* Editorial Feature Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <article
              className="relative lg:col-span-2 p-7 sm:p-8 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 group"
              style={{ opacity: 0, animation: "fadeInUp 0.75s ease-out forwards", animationDelay: "60ms" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-gray-200 bg-gray-50 mb-5 group-hover:bg-red-600 group-hover:border-red-600 transition-colors duration-300">
                <ShieldCheck className="w-6 h-6 text-gray-700 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Gerçeğe En Yakın Deneyim
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl">
                CEFR standartlarına uyumlu testler ile gerçek sınav akışını bire bir deneyimleyin ve sürprizlerle karşılaşmayın.
              </p>
            </article>

            <article
              className="relative p-7 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 group"
              style={{ opacity: 0, animation: "fadeInUp 0.75s ease-out forwards", animationDelay: "180ms" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-gray-200 bg-gray-50 mb-5 group-hover:bg-red-600 group-hover:border-red-600 transition-colors duration-300">
                <Zap className="w-6 h-6 text-gray-700 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                Anında Sonuç
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Test biter bitmez seviyeniz ve detaylı analiziniz saniyeler içinde hazır.
              </p>
            </article>

            <article
              className="relative lg:col-span-3 p-7 rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md transition-shadow duration-300 group"
              style={{ opacity: 0, animation: "fadeInUp 0.75s ease-out forwards", animationDelay: "300ms" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-gray-200 bg-white mb-5 group-hover:bg-red-600 group-hover:border-red-600 transition-colors duration-300">
                <Layout className="w-6 h-6 text-gray-700 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                Sade ve Odaklı Arayüz
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-4xl">
                Gereksiz karmaşa olmadan, yalnızca sınava odaklanmanızı sağlayan akıcı ve profesyonel bir deneyim sunar.
              </p>
            </article>
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
      <section className="py-20 lg:py-24 bg-red-600 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
            Türkçe Seviyenizi Öğrenmeye <br/> Hazır mısınız?
          </h2>
          <p className="text-base sm:text-lg text-red-100 mb-10 font-medium leading-relaxed max-w-2xl mx-auto">
            Binlerce kullanıcının güvendiği platformda Türkçe dil yeterlilik testinizi hemen başlatın.
          </p>

          <NavLink to="/test">
            <Button
              size="lg"
              className="group bg-white text-red-600 hover:bg-gray-50 px-10 py-6 text-base sm:text-lg font-semibold shadow-md hover:shadow-lg rounded-xl transition-all duration-300"
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






