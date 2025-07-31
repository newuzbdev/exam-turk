import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { toast } from "@/utils/toast";
import { ArrowRight } from "lucide-react";
import { NavLink } from "react-router";
import StatsSection from "@/pages/home/stats-section";
import FeaturedSection from "@/pages/home/featured-section";
import HomeLastMonthTopResults from "./ui/home-last-month-top-results";
import HeroSection from "./ui/hero-section";
import HowItWorks from "./ui/how-it-works";
import HomeTestimonials from "./ui/home-testimonials";
import HomePricing from "./ui/home-pricing";

export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Handle OAuth tokens if they exist in URL parameters
  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const error = searchParams.get("error");

    if (error) {
      toast.error("Google ile giriş başarısız: " + error);
      // Clean URL
      navigate("/", { replace: true });
      return;
    }

    if (accessToken) {
      // Store the tokens
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      toast.success("Google ile giriş başarılı!");

      // Clean URL by removing query parameters
      navigate("/", { replace: true });

      // Force page reload to update navbar and fetch user data
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }, [searchParams, navigate]);
  return (
    <div className=" bg-white">
      <HeroSection />

      <StatsSection />

      <FeaturedSection />

      {/* How it Works */}
      <HowItWorks />

      {/* Testimonials */}
      <HomeTestimonials />

      {/* Last 30 Days Results */}
      <HomeLastMonthTopResults />

      {/* Pricing */}
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

      {/* Footer */}
    </div>
  );
}
