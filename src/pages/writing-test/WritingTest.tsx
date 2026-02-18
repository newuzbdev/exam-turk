import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { overallTestFlowStore } from "@/services/overallTest.service";

import WritingTestDemo from "@/components/writing-test/WritingTestDemo";

export default function WritingTest() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Standalone yazma testine yeniden girildiğinde eski cevaplar dolu gelmesin.
    // Genel (overall) test akışı aktif DEĞİLSE, bu test için saklanan cevapları temizliyoruz.
    if (testId && !overallTestFlowStore.hasActive()) {
      try {
        const hasSavedProgress = !!sessionStorage.getItem(`writing_progress_${testId}`);
        if (!hasSavedProgress) {
          sessionStorage.removeItem(`writing_answers_${testId}`);
        }
      } catch {}
    }
  }, [testId]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.add("exam-mode");
      // Double-check exam mode is active if in overall test flow
      if (overallTestFlowStore.hasActive()) {
        document.body.classList.add("exam-mode");
      }
    }

    // Enter fullscreen and lock navigation (exam mode)
    const addNavigationLock = () => {
      const handlePopState = () => {
        window.history.pushState(null, "", window.location.href);
      };
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePopState);

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "";
      };
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    };

    const enterFullscreen = async () => {
      try {
        const el: any = document.documentElement as any;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        else if (el.msRequestFullscreen) await el.msRequestFullscreen();
      } catch {}
    };

    const cleanupNav = addNavigationLock();
    enterFullscreen();

    return () => {
      // Only exit fullscreen if not in overall test flow
      const hasActiveOverallTest = overallTestFlowStore.hasActive();
      if (!hasActiveOverallTest && document.fullscreenElement) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch {}
      }
      cleanupNav?.();
      // leave exam-mode active between chained tests; final page cleans up
    };
  }, []);

  if (!testId) {
    navigate("/test");
    return null;
  }

  // const handleTestComplete = (_submissionId: string) => {
  //   // Don't navigate - let the modal show the results instead
  //   // navigate("/test");
  // };

  return <WritingTestDemo testId={testId} />;
}
