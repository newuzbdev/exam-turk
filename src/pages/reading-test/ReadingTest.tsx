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
      if (typeof document !== "undefined") {
        document.body.classList.remove("exam-mode");
      }
    };
  }, []);

  if (!testId) {
    navigate("/test");
    return null;
  }

  // @ts-expect-error
  return <ReadingTestDemo testId={testId} />;
}
