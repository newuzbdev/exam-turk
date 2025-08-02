import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { NavLink, useSearchParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { toast } from "@/utils/toast";
import { cookieAuthService } from "@/services/cookieAuth.service";
import StatsSection from "@/pages/home/stats-section";
import FeaturedSection from "@/pages/home/featured-section";
import HomeLastMonthTopResults from "./ui/home-last-month-top-results";
import HeroSection from "./ui/hero-section";
import HowItWorks from "./ui/how-it-works";
import HomeTestimonials from "./ui/home-testimonials";
import HomePricing from "./ui/home-pricing";

export default function CookieHome() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Handle OAuth callback without client-side token storage
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Check if this is an OAuth callback (tokens in URL means backend redirect)
      const accessToken = searchParams.get("accessToken");
      const refreshToken = searchParams.get("refreshToken");
      const error = searchParams.get("error");

      // Handle error case
      if (error && !isProcessingOAuth) {
        toast.error("Google ile giriş başarısız: " + error);
        navigate("/", { replace: true });
        return;
      }

      // If tokens are in URL, it means backend hasn't implemented HttpOnly cookies yet
      // In this case, we'll handle the OAuth success and clean the URL
      if ((accessToken || refreshToken) && !isProcessingOAuth) {
        setIsProcessingOAuth(true);

        try {
          console.log("OAuth callback detected, verifying authentication...");

          // Instead of storing tokens, just verify authentication
          // Backend should have already set HttpOnly cookies
          await cookieAuthService.handleGoogleOAuth(navigate);

          // Clean URL by removing query parameters
          navigate("/", { replace: true });
        } catch (error) {
          console.error("OAuth callback error:", error);
          toast.error("Giriş sırasında bir hata oluştu");
          navigate("/", { replace: true });
        } finally {
          setIsProcessingOAuth(false);
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, isProcessingOAuth]);

  return (
    <div className="bg-white">
      <HeroSection />
      <StatsSection />
      <FeaturedSection />
      <HowItWorks />
      <HomeTestimonials />
      <HomeLastMonthTopResults />
      <HomePricing />

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
          <NavLink to="/test-selection">
            <Button
              size="lg"
              className="bg-white text-red-600 hover:bg-gray-100 px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              Ücretsiz Teste Başla
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </NavLink>
        </div>
      </section>
    </div>
  );
}
