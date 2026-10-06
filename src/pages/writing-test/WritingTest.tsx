import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { overallTestTokenStore } from "@/services/overallTest.service";
import { toast } from "sonner";

import WritingTestV2 from "@/components/writing-test/WritingTestV2";

export default function WritingTest() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!testId) return;
    const hasOverallToken = !!overallTestTokenStore.getByTestId(testId);
    if (!hasOverallToken) {
      toast.error("Yazma testi için önce sınav oturumunu başlatmalısınız.");
      navigate("/app/test", { replace: true });
    }
  }, [navigate, testId]);

  if (!testId) {
    return <Navigate to="/app/test" replace />;
  }

  return <WritingTestV2 testId={testId} />;
}
