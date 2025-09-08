import { useNavigate, useParams } from "react-router-dom";

import { ReadingTestDemo } from "@/components/reading-test";

export default function ReadingTest() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  if (!testId) {
    navigate("/test");
    return null;
  }

  return <ReadingTestDemo testId={testId} />;
}
