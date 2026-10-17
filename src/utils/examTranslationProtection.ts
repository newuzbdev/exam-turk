import type { createBrowserRouter } from "react-router";
import { isActiveStudentExam, studentPath } from "@/routes/student-route-paths";

type ExamRouter = Pick<ReturnType<typeof createBrowserRouter>, "state" | "subscribe">;

function isExamScreen(pathname: string): boolean {
  const path = studentPath(pathname) ?? pathname;
  return (
    isActiveStudentExam(path) ||
    /^\/app\/pratik\/(okuma|dinleme|yazma|konusma)\/(?!sonuc(?:\/|$))[^/]+\/?$/.test(path)
  );
}

// Install before React renders so loading screens and body portals are protected,
// too. Restore the document as soon as navigation leaves the exam.
export function installExamTranslationProtection(router: ExamRouter): () => void {
  let restore: (() => void) | undefined;

  const update = (pathname: string) => {
    if (!isExamScreen(pathname)) {
      restore?.();
      restore = undefined;
      return;
    }
    if (restore) return;

    const previous = [document.documentElement, document.body].map((element) => ({
      element,
      translate: element.getAttribute("translate"),
      noTranslate: element.classList.contains("notranslate"),
    }));
    for (const { element } of previous) {
      element.setAttribute("translate", "no");
      element.classList.add("notranslate");
    }
    restore = () => {
      for (const { element, translate, noTranslate } of previous) {
        if (translate === null) element.removeAttribute("translate");
        else element.setAttribute("translate", translate);
        if (!noTranslate) element.classList.remove("notranslate");
      }
    };
  };

  update(router.state.location.pathname);
  const unsubscribe = router.subscribe((state) => update(state.location.pathname));
  return () => {
    unsubscribe();
    restore?.();
    restore = undefined;
  };
}
