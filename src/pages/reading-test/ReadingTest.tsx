import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ReadingTestDemo } from "@/components/reading-test";

export default function ReadingTest() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.add("exam-mode");
    }
    return () => {
      // leave exam-mode active between chained tests; final page cleans up
    };
  }, []);

  if (!testId) {
    navigate("/test");
    return null;
  }

  return <ReadingTestDemo testId={testId} />;
}
