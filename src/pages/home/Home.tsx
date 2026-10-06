import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/utils/toast";
import StatsSection from "@/pages/home/stats-section";
import HomeLastMonthTopResults from "./ui/home-last-month-top-results";
import HeroSection from "./ui/hero-section";
import HomeScorePreview from "./ui/home-score-preview";
import HomeTestimonials from "./ui/home-testimonials";
import HomePricing from "./ui/home-pricing";
import HomeMembershipPricing from "./ui/home-membership-pricing";
import HomeFAQ from "./ui/home-faq";
import { BannerSection } from "@/components/banner";
import { bannerService } from "@/services/banner.service";
import { tm } from "@/components/tm";
import { useStudentAction } from "@/hooks/use-student-action";
import { isSubscriptionBillingEnabled } from "@/config/billing";

export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const openStudentAction = useStudentAction();
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const processedTokenRef = useRef<string | null>(null);
  const homeRootRef = useRef<HTMLDivElement>(null);
  const [hasActiveBanners, setHasActiveBanners] = useState(false);

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

  useEffect(() => {
    const checkActiveBanners = async () => {
      try {
        const allBanners = await bannerService.getAllBanners();
        const activeBanners = allBanners.filter((banner) => {
          const isActive = banner.isActive !== false;
          const now = new Date();
          const startDate = banner.startDate ? new Date(banner.startDate) : null;
          const endDate = banner.endDate ? new Date(banner.endDate) : null;

          if (startDate && now < startDate) return false;
          if (endDate && now > endDate) return false;

          return isActive;
        });

        setHasActiveBanners(activeBanners.length > 0);
      } catch {
        setHasActiveBanners(false);
      }
    };

    checkActiveBanners();
  }, []);

  useEffect(() => {
    const root = homeRootRef.current;
    if (!root) return;

    const sections = Array.from(root.querySelectorAll(":scope > section"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    sections.forEach((section) => section.classList.add("tm-home-reveal"));

    if (reduceMotion || !("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -8%" },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [hasActiveBanners]);

  return (
    <div ref={homeRootRef} className={tm.page}>
      <HeroSection />
      <StatsSection />
      {/* Expert opinions are temporarily hidden; the component is preserved. */}

      <HomeScorePreview />

      <HomeTestimonials />
      <HomeLastMonthTopResults />
      {isSubscriptionBillingEnabled ? (
        <HomeMembershipPricing />
      ) : (
        <HomePricing />
      )}
      <HomeFAQ />
      {hasActiveBanners && <BannerSection position="top" className="py-8" />}

      <section className="bg-[var(--tm-bg-app)] py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-[var(--tm-text-primary)] sm:text-5xl">
            Bugün başla.
          </h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() => openStudentAction("/app/test")}
              className="group rounded-md bg-[var(--tm-accent)] px-6 py-5 text-sm font-medium text-white shadow-none transition-colors hover:bg-[var(--tm-accent-hover)] sm:text-base"
            >
              İlk denemeni çöz
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
