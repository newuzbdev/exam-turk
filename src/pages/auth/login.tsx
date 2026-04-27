import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import TelegramLoginWidget from "@/components/auth/TelegramLoginWidget";
import type { TelegramWidgetUser } from "@/components/auth/TelegramLoginWidget";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config/runtime";
import { authService } from "@/services/auth.service";
import {
  consumePostLoginRedirect,
  resolvePostLoginRedirect,
  setPostLoginRedirect,
} from "@/utils/postLoginRedirect";

type LoginStep = "entry" | "telegramWidget";

const TELEGRAM_BOT_USERNAME =
  import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "turkishmockbot";

const GoogleLogo = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const TelegramLogo = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="#229ED9" />
    <path
      fill="#FFFFFF"
      d="M17.63 7.31L5.84 11.86c-.8.32-.79.77-.14.97l3.03.95 1.17 3.69c.14.4.07.56.49.56.33 0 .47-.15.65-.33l1.59-1.55 3.31 2.45c.61.34 1.04.17 1.19-.56l2.01-9.51c.22-.89-.34-1.29-1.11-.94zm-1.08 2.08l-5.31 4.79-.21 2.22-1.02-3.34 6.54-4.12z"
    />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const state = (location.state as
    | { mode?: "login" | "register"; redirectTo?: string }
    | null) ?? { mode: "login", redirectTo: "/" };
  const redirectTo = resolvePostLoginRedirect(state.redirectTo || "/");

  const [step, setStep] = useState<LoginStep>("entry");
  const [loading, setLoading] = useState(false);

  const navigateAfterLogin = () => {
    navigate(consumePostLoginRedirect(redirectTo), { replace: true });
  };

  useEffect(() => {
    setPostLoginRedirect(redirectTo);
  }, [redirectTo]);

  useEffect(() => {
    if (isAuthenticated) {
      navigateAfterLogin();
    }
  }, [isAuthenticated]);

  const title = useMemo(() => {
    if (step === "telegramWidget") return "Telegram ile Giriş";
    return "TURKISHMOCK'A HOŞ GELDİNİZ";
  }, [step]);

  const subtitle = useMemo(() => {
    if (step === "telegramWidget") {
      return "Resmi Telegram penceresinde hesabınızı onaylayın. Kod girmeniz gerekmez.";
    }
    return "Yöntem seçin, hesap yoksa otomatik oluşturulur.";
  }, [step]);

  const handleGoogle = () => {
    setLoading(true);
    setPostLoginRedirect(redirectTo);
    const callbackUrl = `${window.location.origin}/oauth-callback`;
    window.location.href = `${API_BASE_URL}/api/auth/google/redirect?callback=${encodeURIComponent(
      callbackUrl,
    )}`;
  };

  const handleTelegramAuth = async (telegramUser: TelegramWidgetUser) => {
    setLoading(true);
    const result = await authService.loginWithTelegramWidget({
      id: String(telegramUser.id),
      first_name: String(telegramUser.first_name || ""),
      last_name: telegramUser.last_name ? String(telegramUser.last_name) : undefined,
      username: telegramUser.username ? String(telegramUser.username) : undefined,
      photo_url: telegramUser.photo_url ? String(telegramUser.photo_url) : undefined,
      auth_date: String(telegramUser.auth_date),
      hash: String(telegramUser.hash || ""),
    });

    if (result.success && result.accessToken) {
      authService.storeTokens(result.accessToken, result.refreshToken);
      navigateAfterLogin();
      return;
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <button
          type="button"
          className="flex items-center"
          onClick={() => navigate("/", { replace: true })}
          aria-label="Ana sayfaya dön"
        >
          <img src="/logo11.svg" alt="TURKISHMOCK" className="h-10 w-auto" />
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Geri
        </button>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-xl flex-col items-center justify-center px-4 pb-10">
        <h1 className="text-center text-3xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-2 text-center text-sm text-gray-500">{subtitle}</p>

        {step === "entry" ? (
          <div className="mt-8 w-full max-w-md space-y-3">
            <Button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="h-11 w-full justify-center gap-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
            >
              <GoogleLogo />
              Google ile Devam Et
            </Button>
            <Button
              type="button"
              onClick={() => setStep("telegramWidget")}
              disabled={loading}
              className="h-11 w-full justify-center gap-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
            >
              <TelegramLogo />
              Telegram ile Devam Et
            </Button>
          </div>
        ) : null}

        {step === "telegramWidget" ? (
          <div className="mt-8 w-full max-w-md space-y-4">
            <TelegramLoginWidget
              botUsername={TELEGRAM_BOT_USERNAME}
              onAuth={handleTelegramAuth}
            />

            <p className="text-center text-sm text-gray-500">
              Telegram hesabınızı seçip onay verdiğiniz anda giriş tamamlanır.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("entry")}
                disabled={loading}
              >
                Geri
              </Button>
              <Button
                type="button"
                disabled
                className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:text-white"
              >
                {loading ? "Giriş tamamlanıyor..." : "Telegram onayı bekleniyor"}
              </Button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
