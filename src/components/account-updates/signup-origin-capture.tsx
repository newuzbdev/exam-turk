import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasAdultDeclaration } from "@/utils/studentAgeEligibility";
import {
  readSignupAttribution,
  clearSignupAttribution,
} from "@/utils/signup-attribution";
import { captureOwnSignupOrigin } from "@/services/signupOrigin.service";
export default function SignupOriginCapture() {
  const { user, isAuthenticated } = useAuth();
  const id =
    isAuthenticated && user?.role === "USER" && hasAdultDeclaration(user)
      ? user.id
      : undefined;
  useEffect(() => {
    if (!id || import.meta.env.VITE_ADMIN_LAUNCH_FEATURES_ENABLED !== "true")
      return;
    let stopped = false;
    let flight: AbortController | undefined;
    let timer: number | undefined;
    let tries = 0;
    async function capture() {
      if (
        stopped ||
        flight ||
        tries >= 3 ||
        sessionStorage.getItem("userId") !== id ||
        document.visibilityState === "hidden"
      )
        return;
      window.clearTimeout(timer);
      timer = undefined;
      const controller = new AbortController();
      flight = controller;
      const deadline = window.setTimeout(() => controller.abort(), 5000);
      try {
        await captureOwnSignupOrigin(
          id!,
          readSignupAttribution(),
          controller.signal,
        );
        if (
          !stopped &&
          !controller.signal.aborted &&
          sessionStorage.getItem("userId") === id
        ) {
          clearSignupAttribution();
          stopped = true;
        }
      } catch {
        if (!stopped && ++tries < 3)
          timer = window.setTimeout(() => void capture(), 15000);
      } finally {
        window.clearTimeout(deadline);
        if (flight === controller) flight = undefined;
      }
    }
    const visible = () => {
      if (!stopped && !flight && document.visibilityState !== "hidden")
        void capture();
    };
    document.addEventListener("visibilitychange", visible);
    void capture();
    return () => {
      stopped = true;
      flight?.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [id]);
  return null;
}
