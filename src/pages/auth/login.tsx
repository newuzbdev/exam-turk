import { LegalLinks } from "@/components/legal-links";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config/runtime";
import { authService } from "@/services/auth.service";
import {
  consumePostLoginRedirect,
  resolvePostLoginRedirect,
  setPostLoginRedirect,
} from "@/utils/postLoginRedirect";
import { clearExamPresentation } from "@/utils/examFullscreen";
import TelegramLoginWidget, {
  type TelegramWidgetUser,
} from "@/components/auth/TelegramLoginWidget";

import { captureAccessLink } from '@/utils/access-link-context';

type LoginStep = "entry" | "telegramApproval";

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
    | null) ?? { mode: "login" };
  const [redirectTo] = useState(() => state.redirectTo ? captureAccessLink(state.redirectTo).safeReturnTo : resolvePostLoginRedirect());

  const [step, setStep] = useState<LoginStep>("entry");
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({ name: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [localLoginOpen, setLocalLoginOpen] = useState(false);
  const telegramBotUsername =
    import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "turkishmockbot";

  useLayoutEffect(() => {
    void clearExamPresentation();
  }, []);

  const navigateAfterLogin = useCallback(() => {
    navigate(consumePostLoginRedirect(redirectTo), { replace: true });
  }, [navigate, redirectTo]);

  const handleBack = () => {
    if (step === "telegramApproval") {
      setStep("entry");
      setLoading(false);
      return;
    }

    const historyIndex = window.history.state?.idx;

    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate("/", { replace: true });
  };

  useEffect(() => {
    setPostLoginRedirect(redirectTo);
  }, [redirectTo]);

  useEffect(() => {
    if (isAuthenticated) {
      navigateAfterLogin();
    }
  }, [isAuthenticated, navigateAfterLogin]);

  const title = useMemo(() => {
    if (step === "telegramApproval") return "Girişini onayla.";
    return "Giriş yap.";
  }, [step]);

  const subtitle = useMemo(() => {
    if (step === "telegramApproval") {
      return "";
    }
    return "";
  }, [step]);

  const handleGoogle = () => {
    setLoading(true);
    setPostLoginRedirect(redirectTo);
    const callbackUrl = `${window.location.origin}/oauth-callback`;
    window.location.href = `${API_BASE_URL}/api/auth/google/redirect?callback=${encodeURIComponent(
      callbackUrl,
    )}`;
  };

  const handleCredentialsLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!credentials.name.trim() || !credentials.password.trim()) return;

    setLoading(true);
    const result = await authService.loginWithCredentials(
      {
        name: credentials.name.trim(),
        password: credentials.password,
      },
      (path, options) => {
        if (path === "/") {
          navigateAfterLogin();
          return;
        }
        navigate(path, options);
      },
    );

    if (!result.success) {
      setLoading(false);
    }
  };

  const handleTelegramAuth = useCallback(async (user: TelegramWidgetUser) => {
    setLoading(true);
    const result = await authService.loginWithTelegramWidget({
      id: String(user.id),
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: user.photo_url,
      auth_date: String(user.auth_date),
      hash: user.hash,
    });

    if (result.success && result.accessToken) {
      authService.storeTokens(result.accessToken, result.refreshToken);
      navigateAfterLogin();
      return;
    }

    setLoading(false);
  }, [navigateAfterLogin]);

  const credentialsForm = (
    <form onSubmit={handleCredentialsLogin} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--tm-text-primary)]">
          Hesap bilgisi
        </label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--tm-text-tertiary)]" />
          <Input
            value={credentials.name}
            onChange={(event) =>
              setCredentials((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Kullanıcı adı veya e-posta"
            autoComplete="username"
            className="h-12 rounded-md border-[var(--tm-border-default)] bg-white pl-11 shadow-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--tm-text-primary)]">
          Şifre
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--tm-text-tertiary)]" />
          <Input
            value={credentials.password}
            onChange={(event) =>
              setCredentials((prev) => ({ ...prev, password: event.target.value }))
            }
            placeholder="Şifrenizi girin"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="h-12 rounded-md border-[var(--tm-border-default)] bg-white px-11 shadow-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--tm-text-tertiary)] transition hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)]"
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !credentials.name.trim() || !credentials.password.trim()}
        className="h-12 w-full gap-2 rounded-md bg-[var(--tm-text-primary)] font-semibold text-white hover:bg-black disabled:bg-neutral-300"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Giriş yapılıyor</>
        ) : (
          <>Giriş yap<ArrowRight className="h-4 w-4" /></>
        )}
      </Button>
    </form>
  );

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <header className="h-14 w-full border-b border-[var(--tm-border-subtle)] bg-[var(--tm-bg-app)]/95">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-2 px-6 sm:px-10 lg:px-8">
          <button
            type="button"
            className="flex shrink-0 items-center justify-center"
            onClick={() => navigate("/", { replace: true })}
            aria-label="Ana sayfaya dön"
          >
            <img
              src="/logo11-aligned.svg"
              alt="TURKISHMOCK"
              className="block h-10 w-auto object-contain sm:h-11 md:h-12"
            />
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-[var(--tm-text-secondary)] transition-colors hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)]"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Geri
          </button>
        </div>
      </header>

      <div className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 pb-24 pt-8 sm:px-10 lg:grid-cols-[minmax(360px,0.78fr)_minmax(520px,1.22fr)] lg:px-8 lg:pb-20 lg:pt-0">
        <section className="relative z-10 mx-auto w-full max-w-[430px] bg-white lg:mx-0">
          <div className="mb-8">
            <h1 className="whitespace-nowrap text-[clamp(1.65rem,3.25vw,2.65rem)] font-semibold leading-[1.06] tracking-[-0.035em] text-[var(--tm-text-primary)]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-4 text-base leading-7 text-[var(--tm-text-secondary)]">
                {subtitle}
              </p>
            ) : null}
          </div>

          {step === "entry" ? (
            <div className="space-y-3">
              <Button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                aria-label="Google ile giriş yap"
                className="h-13 w-full justify-center gap-3 rounded-md border border-[var(--tm-border-default)] bg-white text-base font-medium text-[var(--tm-text-primary)] shadow-none hover:bg-[var(--tm-bg-hover)]"
              >
                <GoogleLogo />
                Google
              </Button>
              <Button
                type="button"
                onClick={() => setStep("telegramApproval")}
                disabled={loading}
                aria-label="Telegram ile giriş yap"
                className="h-13 w-full justify-center gap-3 rounded-md border border-[var(--tm-border-default)] bg-white text-base font-medium text-[var(--tm-text-primary)] shadow-none hover:bg-[var(--tm-bg-hover)]"
              >
                <TelegramLogo />
                Telegram
              </Button>
            </div>
          ) : (
            <div className="flex min-h-14 items-center justify-center rounded-md border border-[var(--tm-border-default)] bg-white px-4 py-3">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[var(--tm-text-secondary)]" />
              ) : (
                <TelegramLoginWidget
                  botUsername={telegramBotUsername}
                  onAuth={handleTelegramAuth}
                />
              )}
            </div>
          )}
        </section>

        <section className="relative z-10 hidden min-h-[540px] items-center justify-center lg:flex" aria-hidden="true">
          <div className="absolute inset-x-[12%] top-1/2 h-48 -translate-y-1/2 rounded-full bg-[var(--tm-bg-muted)] blur-3xl" />
          <img
            src="/turkishmock-login-entry-alt-door.png"
            alt=""
            className="relative z-10 max-h-[610px] w-full max-w-[700px] object-contain"
          />
        </section>
      </div>

      <footer className="absolute bottom-5 right-6 left-6 flex justify-end sm:right-10 sm:left-10">
        <LegalLinks className="justify-end text-xs leading-5 text-[var(--tm-text-secondary)]" />
      </footer>

      {import.meta.env.DEV && import.meta.env.VITE_ENABLE_LOCAL_PASSWORD_LOGIN === "true" ? (
        <button
          type="button"
          onClick={() => setLocalLoginOpen(true)}
          className="absolute bottom-14 left-6 text-[11px] text-[var(--tm-text-tertiary)] underline decoration-[var(--tm-border-default)] underline-offset-4 transition-colors hover:text-[var(--tm-text-primary)] sm:left-10"
        >
          Giriş
        </button>
      ) : null}

      {import.meta.env.DEV && import.meta.env.VITE_ENABLE_LOCAL_PASSWORD_LOGIN === "true" ? (
        <Dialog open={localLoginOpen} onOpenChange={setLocalLoginOpen}>
          <DialogContent
            className="max-w-[420px] gap-6 rounded-xl border-[var(--tm-border-default)] p-6 shadow-2xl sm:p-7"
            overlayClassName="bg-black/30 backdrop-blur-[2px]"
          >
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-[var(--tm-text-primary)]">
                Yerel giriş
              </DialogTitle>
              <DialogDescription className="leading-6 text-[var(--tm-text-secondary)]">
                Hesap bilgilerin ve şifrenle oturum aç.
              </DialogDescription>
            </DialogHeader>
            {credentialsForm}
          </DialogContent>
        </Dialog>
      ) : null}
    </main>
  );
}
