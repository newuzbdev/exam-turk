import { useEffect, useLayoutEffect, useState } from "react";
import { Footer } from "./footer";
import Navbar from "./navbar";
import { Outlet, useLocation } from "react-router";
import { ConfettiSideCannons } from "./ui/confetti-side-cannons";
import { clearExamPresentation } from "@/utils/examFullscreen";

const ACTIVE_EXAM_ROUTE_PREFIXES = [
  "/listening-test/",
  "/reading-test/",
  "/writing-test/",
  "/speaking-test/",
];

const isActiveExamRoute = (pathname: string) => {
  if (pathname === "/overall-section-ready") return true;

  return ACTIVE_EXAM_ROUTE_PREFIXES.some(
    (prefix) =>
      pathname.startsWith(prefix) &&
      !pathname.startsWith(`${prefix}results/`),
  );
};

const isRunningExamRoute = (pathname: string) =>
  ACTIVE_EXAM_ROUTE_PREFIXES.some(
    (prefix) =>
      pathname.startsWith(prefix) &&
      !pathname.startsWith(`${prefix}results/`),
  );

const Layout = () => {
  const [isExamMode, setIsExamMode] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.body.classList.contains("exam-mode");
  });
  const location = useLocation();
  const [showConfetti, setShowConfetti] = useState(false);
  const hideGlobalChrome =
    isExamMode || isActiveExamRoute(location.pathname);

  useLayoutEffect(() => {
    if (isRunningExamRoute(location.pathname)) return;
    void clearExamPresentation();
  }, [location.pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const obs = new MutationObserver(() => {
      setIsExamMode(document.body.classList.contains("exam-mode"));
    });

    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => obs.disconnect();
  }, []);

  // Check if we're on a results page
  useEffect(() => {
    const isResultsPage = 
      location.pathname.includes("/results/") || 
      location.pathname.includes("/overall-results/");
    
    if (isResultsPage) {
      // Longer delay for overall-results to ensure data is loaded
      const delay = location.pathname.includes("/overall-results/") ? 1000 : 500;
      const timer = setTimeout(() => {
        setShowConfetti(true);
      }, delay);
      return () => {
        clearTimeout(timer);
        setShowConfetti(false);
      };
    } else {
      setShowConfetti(false);
    }
  }, [location.pathname]);

  return (
    <div className="bg-white">
      {!hideGlobalChrome && <Navbar />}
      <main>
        <Outlet />
        {!hideGlobalChrome && <Footer />}
      </main>
      {showConfetti && <ConfettiSideCannons key={location.pathname} />}
    </div>
  );
};

export default Layout;
