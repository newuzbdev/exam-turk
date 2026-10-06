import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  getOverallSectionTimerErrorCode,
  overallTestFlowStore,
  overallTestService,
  overallTestTokenStore,
} from "@/services/overallTest.service";

const HEARTBEAT_INTERVAL_MS = 20_000;

export const useOverallSectionHeartbeat = (
  testId: string | null | undefined,
) => {
  const navigate = useNavigate();
  const recoveryHandledRef = useRef(false);
  const expiryHandledRef = useRef(false);
  const submittedHandledRef = useRef(false);

  useEffect(() => {
    recoveryHandledRef.current = false;
    expiryHandledRef.current = false;
    submittedHandledRef.current = false;
    if (!testId || !overallTestTokenStore.getByTestId(testId)) return;

    let disposed = false;
    const sendHeartbeat = async () => {
      try {
        const heartbeat =
          await overallTestService.heartbeatSectionForTest(testId);
        if (
          !disposed &&
          !submittedHandledRef.current &&
          String(heartbeat?.status || "").toUpperCase() === "SUBMITTED"
        ) {
          submittedHandledRef.current = true;
          window.dispatchEvent(
            new CustomEvent("overall-section-submitted", {
              detail: { testId },
            }),
          );
        }
      } catch (error) {
        const code = getOverallSectionTimerErrorCode(error);
        if (!disposed && !expiryHandledRef.current && code === "TEST_TIME_EXPIRED") {
          expiryHandledRef.current = true;
          window.dispatchEvent(
            new CustomEvent("overall-section-time-expired", {
              detail: { testId },
            }),
          );
          return;
        }
        if (
          disposed ||
          recoveryHandledRef.current ||
          code !== "SESSION_RECOVERY_EXPIRED"
        ) {
          return;
        }

        recoveryHandledRef.current = true;
        overallTestFlowStore.clear();
        toast.error(
          "Sınava dönmek için ayrılan 5 dakikalık süre doldu. Yeni bir sınav başlatabilirsiniz.",
        );
        navigate("/app/test?session=expired", { replace: true });
      }
    };

    void sendHeartbeat();
    const intervalId = window.setInterval(
      () => void sendHeartbeat(),
      HEARTBEAT_INTERVAL_MS,
    );
    const handleVisibilityChange = () => {
      // Refresh the recovery baseline both when leaving and returning.
      void sendHeartbeat();
    };
    const handlePageHide = () => {
      void sendHeartbeat();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [navigate, testId]);
};
