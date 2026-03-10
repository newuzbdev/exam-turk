import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Phone, User } from "lucide-react";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/utils/toast";
import { authService } from "@/services/auth.service";
import { API_BASE_URL } from "@/config/runtime";
import { useAuth } from "@/contexts/AuthContext";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type LoginStep =
  | "entry"
  | "phone"
  | "phoneOtp"
  | "phoneSetup"
  | "password"
  | "telegramOtp"
  | "resetPhone"
  | "resetOtp";

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

const TELEGRAM_BOT_USERNAME =
  import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "turkishmockbot";

const formatPhoneForInput = (value: string) => {
  let input = value || "";
  if (input.startsWith("+")) {
    input = "+" + input.slice(1).replace(/\D/g, "");
  } else {
    input = input.replace(/\D/g, "");
  }

  let digits = input.replace(/\D/g, "");
  if (!digits.length) return "+998 ";
  if (!digits.startsWith("998")) {
    digits = digits.startsWith("8") ? `99${digits}` : `998${digits}`;
  }
  digits = digits.slice(0, 12);

  let formatted = "+998";
  if (digits.length > 3) formatted += ` ${digits.slice(3, 5)}`;
  if (digits.length > 5) formatted += ` ${digits.slice(5, 8)}`;
  if (digits.length > 8) formatted += ` ${digits.slice(8, 10)}`;
  if (digits.length > 10) formatted += ` ${digits.slice(10, 12)}`;
  return formatted;
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const state = (location.state as
    | { mode?: "login" | "register"; redirectTo?: string }
    | null) ?? { mode: "login", redirectTo: "/" };
  const redirectTo = state.redirectTo || "/";

  const [step, setStep] = useState<LoginStep>("entry");
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState("+998 ");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [telegramOtp, setTelegramOtp] = useState("");
  const [telegramSessionToken, setTelegramSessionToken] = useState<string | null>(null);
  const [telegramBotLink, setTelegramBotLink] = useState<string | null>(null);
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState("");

  const [credentials, setCredentials] = useState({
    identifier: "",
    password: "",
  });

  const [phoneSetup, setPhoneSetup] = useState({
    userName: "",
    password: "",
  });

  const [resetForm, setResetForm] = useState({
    phone: "+998 ",
    otp: "",
    newPassword: "",
  });

  const navigateAfterLogin = () => {
    navigate(redirectTo, { replace: true });
  };

  const rememberPhone = (rawPhone: string) => {
    if (typeof window === "undefined") return;
    const normalized = authService.formatPhoneNumber(rawPhone);
    if (normalized) {
      localStorage.setItem("login:lastPhone", normalized);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigateAfterLogin();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedPhone = localStorage.getItem("login:lastPhone");
    if (!storedPhone) return;
    const formatted = formatPhoneForInput(storedPhone);
    setPhone(formatted);
    setResetForm((prev) => ({ ...prev, phone: formatted }));
  }, []);

  const title = useMemo(() => {
    if (step === "phoneOtp") return "SMS Kodu";
    if (step === "phoneSetup") return "Hesabı Tamamla";
    if (step === "password") return "Kullanıcı Girişi";
    if (step === "telegramOtp") return "Telegram Kodu";
    if (step === "resetPhone") return "Şifre Sıfırlama";
    if (step === "resetOtp") return "Yeni Şifre";
    return "TURKISHMOCK'A HOŞ GELDİNİZ";
  }, [step]);

  const subtitle = useMemo(() => {
    if (step === "entry")
      return "Yöntem seçin, hesap yoksa otomatik oluşturulur.";
    if (step === "phone") return "Telefon numaranızı girip devam edin.";
    if (step === "phoneOtp") return "Numaranıza gelen 4 haneli kodu girin.";
    if (step === "phoneSetup")
      return "İlk giriş için kullanıcı adı ve şifre oluşturun.";
    if (step === "password")
      return "Daha önce kayıt olduysan kullanıcı adı/telefon ve şifre ile gir.";
    if (step === "telegramOtp")
      return "Botta gelen 4 veya 6 haneli kodu girin.";
    if (step === "resetPhone") return "Telefon numaranızı girin.";
    if (step === "resetOtp") return "OTP ve yeni şifre girin.";
    return "";
  }, [step]);

  const handleGoogle = () => {
    setLoading(true);
    const callbackUrl = `${window.location.origin}/oauth-callback`;
    window.location.href = `${API_BASE_URL}/api/auth/google/redirect?callback=${encodeURIComponent(
      callbackUrl,
    )}`;
  };

  const handleTelegramStart = async () => {
    setLoading(true);
    const result = await authService.initTelegramAuth();
    setLoading(false);
    if (result) {
      setTelegramSessionToken(result.sessionToken);
      setTelegramBotLink(result.botLink);
      setTelegramOtp("");
      setStep("telegramOtp");
      if (result.botLink) window.open(result.botLink, "_blank", "noopener,noreferrer");
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await authService.sendOtpRequest(phone);
    if (result.success) {
      rememberPhone(phone);
      setStep("phoneOtp");
      setPhoneOtp("");
    }
    setLoading(false);
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneOtp.length !== 4) return;

    setLoading(true);
    const result = await authService.verifyOtpForLogin(
      phone,
      phoneOtp,
      () => {
        toast.info("Hesabınız bulundu, giriş yapılıyor...");
        rememberPhone(phone);
        navigateAfterLogin();
      },
    );

    if (result?.shouldShowRegister) {
      setVerifiedPhoneNumber(
        result.phoneNumber || authService.formatPhoneNumber(phone),
      );
      setPhoneSetup({ userName: "", password: "" });
      setStep("phoneSetup");
    }
    setLoading(false);
  };

  const handleCompletePhoneSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneSetup.userName.trim()) {
      toast.error("Kullanıcı adı girin");
      return;
    }
    if (phoneSetup.password.trim().length < 6) {
      toast.error("Şifre en az 6 karakter olmalı");
      return;
    }

    const phoneNumber =
      verifiedPhoneNumber || authService.formatPhoneNumber(phone);

    setLoading(true);
    await authService.registerUser(
      {
        name: phoneSetup.userName.trim(),
        userName: phoneSetup.userName.trim(),
        password: phoneSetup.password,
        phoneNumber,
        avatarUrl: "",
        accountType: "STUDENT",
      },
      () => navigateAfterLogin(),
    );
    setLoading(false);
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.identifier.trim() || !credentials.password.trim()) {
      toast.error("Kullanıcı adı/telefon ve şifre girin");
      return;
    }
    setLoading(true);
    await authService.loginWithCredentials(
      {
        name: credentials.identifier.trim(),
        password: credentials.password,
      },
      () => navigateAfterLogin(),
    );
    setLoading(false);
  };

  const handleTelegramVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeLen = telegramOtp.length;
    if (codeLen < 4 || codeLen > 6) return;
    if (!telegramSessionToken) {
      toast.error("Önce \"Telegram ile giriş\"e tıklayıp bot linkini açın.");
      return;
    }

    setLoading(true);
    const result = await authService.verifyTelegramCode(telegramOtp, telegramSessionToken);
    if (result.success && result.accessToken) {
      authService.storeTokens(result.accessToken, result.refreshToken);
      navigateAfterLogin();
    }
    setLoading(false);
  };

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await authService.requestPasswordReset(resetForm.phone);
    if (result.success) {
      rememberPhone(resetForm.phone);
      setResetForm((prev) => ({ ...prev, otp: "", newPassword: "" }));
      setStep("resetOtp");
    }
    setLoading(false);
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetForm.otp.length !== 4) {
      toast.error("4 haneli kodu girin");
      return;
    }
    if (resetForm.newPassword.trim().length < 6) {
      toast.error("Şifre en az 6 karakter olmalı");
      return;
    }

    setLoading(true);
    const result = await authService.confirmPasswordReset(
      resetForm.phone,
      resetForm.otp,
      resetForm.newPassword,
    );
    if (result.success) {
      const normalizedPhone = authService.formatPhoneNumber(resetForm.phone);
      setCredentials((prev) => ({
        ...prev,
        identifier: normalizedPhone || prev.identifier,
        password: "",
      }));
      setStep("password");
    }
    setLoading(false);
  };

  const normalizedPhoneForOtp = authService.formatPhoneNumber(phone);
  const isPhoneReadyForOtp = /^\+998\d{9}$/.test(normalizedPhoneForOtp || "");
  const normalizedResetPhone = authService.formatPhoneNumber(resetForm.phone);
  const isResetPhoneReadyForOtp = /^\+998\d{9}$/.test(normalizedResetPhone || "");
  const isResetOtpReady =
    resetForm.otp.length === 4 && resetForm.newPassword.trim().length >= 6;

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
              onClick={handleTelegramStart}
              disabled={loading}
              className="h-11 w-full justify-center gap-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
            >
              <TelegramLogo />
              Telegram ile Devam Et
            </Button>
            <Button
              type="button"
              onClick={() => setStep("phone")}
              disabled={loading}
              className="h-11 w-full justify-center gap-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
            >
              <Phone className="h-5 w-5" />
              Telefon ile Devam Et
            </Button>
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs uppercase tracking-wide text-gray-500">ya da</span>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setStep("password")}
              className="h-11 w-full justify-center gap-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
            >
              <User className="h-5 w-5" />
              Kullanıcı adı ile devam edin
            </Button>
            <p className="text-center text-xs text-gray-500">
              Daha önce kayıt olduysanız bu yöntemle giriş yapın.
            </p>
          </div>
        ) : null}

        {step === "phone" ? (
          <div className="mt-8 w-full max-w-md space-y-4">
            <form onSubmit={handleSendPhoneOtp} className="space-y-3">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneForInput(e.target.value))}
                className="h-11"
                placeholder="+998 90 123 45 67"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setStep("entry")}>
                  Geri
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !isPhoneReadyForOtp}
                  className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:text-white"
                >
                  {loading ? "Gönderiliyor..." : "Devam Et"}
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        {step === "phoneOtp" ? (
          <form onSubmit={handleVerifyPhoneOtp} className="mt-8 w-full max-w-md space-y-4">
            <p className="text-center text-sm text-gray-500">{phone}</p>
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                value={phoneOtp}
                onChange={setPhoneOtp}
              >
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className="h-12 w-12" />
                  <InputOTPSlot index={1} className="h-12 w-12" />
                  <InputOTPSlot index={2} className="h-12 w-12" />
                  <InputOTPSlot index={3} className="h-12 w-12" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("phone")}>
                Geri
              </Button>
              <Button
                type="submit"
                disabled={loading || phoneOtp.length !== 4}
                className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:text-white"
              >
                {loading ? "Doğrulanıyor..." : "Devam Et"}
              </Button>
            </div>
          </form>
        ) : null}

        {step === "phoneSetup" ? (
          <form
            onSubmit={handleCompletePhoneSetup}
            className="mt-8 w-full max-w-md space-y-4"
          >
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              Telefon: {verifiedPhoneNumber || authService.formatPhoneNumber(phone)}
            </div>
            <Input
              type="text"
              value={phoneSetup.userName}
              onChange={(e) =>
                setPhoneSetup((prev) => ({ ...prev, userName: e.target.value }))
              }
              className="h-11"
              placeholder="Kullanıcı adı"
            />
            <Input
              type="password"
              value={phoneSetup.password}
              onChange={(e) =>
                setPhoneSetup((prev) => ({ ...prev, password: e.target.value }))
              }
              className="h-11"
              placeholder="Şifre (en az 6 karakter)"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("phoneOtp")}>
                Geri
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Oluşturuluyor..." : "Hesabı Tamamla"}
              </Button>
            </div>
          </form>
        ) : null}

        {step === "password" ? (
          <form onSubmit={handleCredentialLogin} className="mt-8 w-full max-w-md space-y-4">
            <Input
              type="text"
              value={credentials.identifier}
              onChange={(e) =>
                setCredentials((prev) => ({
                  ...prev,
                  identifier: e.target.value,
                }))
              }
              className="h-11"
              placeholder="Kullanıcı adı veya telefon"
            />
            <Input
              type="password"
              value={credentials.password}
              onChange={(e) =>
                setCredentials((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              className="h-11"
              placeholder="Şifre"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("entry")}>
                Geri
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  !credentials.identifier.trim() ||
                  !credentials.password.trim()
                }
                className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:text-white"
              >
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </Button>
            </div>
            <button
              type="button"
              className="w-full text-right text-xs text-gray-500 hover:text-gray-800"
              onClick={() => setStep("resetPhone")}
            >
              Şifremi unuttum
            </button>
          </form>
        ) : null}

        {step === "telegramOtp" ? (
          <form onSubmit={handleTelegramVerify} className="mt-8 w-full max-w-md space-y-4">
            {telegramBotLink ? (
              <a
                href={telegramBotLink || `https://t.me/${TELEGRAM_BOT_USERNAME}`}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-sm text-[#229ED9] underline"
              >
                Botu aç (@{TELEGRAM_BOT_USERNAME}, kod burada görünecek)
              </a>
            ) : (
              <p className="text-center text-sm text-gray-500">
                Telegram ile giriş başlatıldığında bot linki açılır.
              </p>
            )}

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                value={telegramOtp}
                onChange={setTelegramOtp}
              >
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className="h-12 w-12" />
                  <InputOTPSlot index={1} className="h-12 w-12" />
                  <InputOTPSlot index={2} className="h-12 w-12" />
                  <InputOTPSlot index={3} className="h-12 w-12" />
                  <InputOTPSlot index={4} className="h-12 w-12" />
                  <InputOTPSlot index={5} className="h-12 w-12" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("entry");
                  setTelegramSessionToken(null);
                  setTelegramBotLink(null);
                }}
              >
                Geri
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  telegramOtp.length < 4 ||
                  telegramOtp.length > 6 ||
                  !telegramSessionToken
                }
                className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:text-white"
              >
                {loading ? "Doğrulanıyor..." : "Doğrula"}
              </Button>
            </div>
          </form>
        ) : null}

        {step === "resetPhone" ? (
          <form onSubmit={handleSendResetOtp} className="mt-8 w-full max-w-md space-y-4">
            <Input
              type="tel"
              value={resetForm.phone}
              onChange={(e) =>
                setResetForm((prev) => ({
                  ...prev,
                  phone: formatPhoneForInput(e.target.value),
                }))
              }
              className="h-11"
              placeholder="+998 90 123 45 67"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("phone")}>
                Geri
              </Button>
              <Button
                type="submit"
                disabled={loading || !isResetPhoneReadyForOtp}
                className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:text-white"
              >
                {loading ? "Gönderiliyor..." : "Kod Gönder"}
              </Button>
            </div>
          </form>
        ) : null}

        {step === "resetOtp" ? (
          <form onSubmit={handleConfirmReset} className="mt-8 w-full max-w-md space-y-4">
            <p className="text-center text-sm text-gray-500">{resetForm.phone}</p>
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                value={resetForm.otp}
                onChange={(value) =>
                  setResetForm((prev) => ({ ...prev, otp: value }))
                }
              >
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className="h-12 w-12" />
                  <InputOTPSlot index={1} className="h-12 w-12" />
                  <InputOTPSlot index={2} className="h-12 w-12" />
                  <InputOTPSlot index={3} className="h-12 w-12" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Input
              type="password"
              value={resetForm.newPassword}
              onChange={(e) =>
                setResetForm((prev) => ({
                  ...prev,
                  newPassword: e.target.value,
                }))
              }
              className="h-11"
              placeholder="Yeni şifre"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("resetPhone")}>
                Geri
              </Button>
              <Button
                type="submit"
                disabled={loading || !isResetOtpReady}
                className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:text-white"
              >
                {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
              </Button>
            </div>
          </form>
        ) : null}
      </main>
    </div>
  );
}
