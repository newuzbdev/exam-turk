import { useNavigate, useParams } from "react-router-dom";

import WritingTestDemo from "@/components/writing-test/WritingTestDemo";

export default function WritingTest() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

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
