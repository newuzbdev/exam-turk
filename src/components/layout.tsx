import { useEffect, useState } from "react";
import { Footer } from "./footer";
import Navbar from "./navbar";
import { Outlet } from "react-router";

const Layout = () => {
  const [isExamMode, setIsExamMode] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.body.classList.contains("exam-mode");
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const obs = new MutationObserver(() => {
      setIsExamMode(document.body.classList.contains("exam-mode"));
    });

    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => obs.disconnect();
  }, []);

  return (
    <div className="bg-white">
      {!isExamMode && <Navbar />}
      <main>
        <Outlet />
        {!isExamMode && <Footer />}
      </main>
    </div>
  );
};

export default Layout;
