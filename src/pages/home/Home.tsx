import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { NavLink, useSearchParams, useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/utils/toast";
import StatsSection from "@/pages/home/stats-section";
import FeaturedSection from "@/pages/home/featured-section";
import HomeLastMonthTopResults from "./ui/home-last-month-top-results";
import HeroSection from "./ui/hero-section";
import HowItWorks from "./ui/how-it-works";
import HomeWhoIsFor from "./ui/home-who-is-for";
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
