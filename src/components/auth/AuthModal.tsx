import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Eye, EyeOff, X } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { authService } from "@/services/auth.service";
import { API_BASE_URL } from "@/config/runtime";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type AuthIntent = "login" | "register";
type ModalStep =
  | "method"
  | "passwordLogin"
  | "phone"
  | "otp"
  | "register"
  | "resetPhone"
  | "resetOtp";
type OtpFlow = "login" | "register";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "login" | "register";
}

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

const phoneHasEnoughDigits = (value: string) =>
  value.replace(/\D/g, "").length >= 12;

export default function AuthModal({
  open,
  onOpenChange,
  initialMode = "login",
}: AuthModalProps) {
  const navigate = useNavigate();

  const [intent, setIntent] = useState<AuthIntent>(initialMode);
  const [step, setStep] = useState<ModalStep>("method");
  const [otpFlow, setOtpFlow] = useState<OtpFlow>(
    initialMode === "register" ? "register" : "login",
  );

  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const [phone, setPhone] = useState("+998 ");
  const [otp, setOtp] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [passwordLogin, setPasswordLogin] = useState({
    identifier: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    userName: "",
    password: "",
    confirmPassword: "",
  });

  const [resetForm, setResetForm] = useState({
    phone: "+998 ",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const resetAll = (mode: AuthIntent) => {
    setIntent(mode);
    setStep("method");
    setOtpFlow(mode === "register" ? "register" : "login");
    setLoading(false);
    setTimer(0);
    setCanResend(false);
    setPhone("+998 ");
    setOtp("");
    setVerifiedPhone("");
    setShowPassword(false);
    setShowNewPassword(false);
    setPasswordLogin({ identifier: "", password: "" });
    setRegisterForm({
      name: "",
      userName: "",
      password: "",
      confirmPassword: "",
    });
    setResetForm({
      phone: "+998 ",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  useEffect(() => {
    if (open) {
      resetAll(initialMode);
    }
  }, [open, initialMode]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const title = useMemo(() => {
    if (step === "method") return "Hizli Giris";
    if (step === "passwordLogin") return "Sifre ile Giris";
    if (step === "phone") return "Telefon Dogrulama";
    if (step === "otp") return "OTP Kodu";
    if (step === "register") return "Hesap Tamamlama";
    if (step === "resetPhone") return "Sifre Sifirlama";
    return "Yeni Sifre";
  }, [step]);

  const subtitle = useMemo(() => {
    if (step === "method") {
      return intent === "register"
        ? "Google veya telefon ile kayit olun"
        : "Google, telefon OTP veya sifre ile devam edin";
    }
    if (step === "register") {
      return "Bilgilerinizi tamamlayin ve sifrenizi kaydedin";
    }
    if (step === "resetOtp") {
      return "OTP ile yeni sifre belirleyin";
    }
    return "";
  }, [intent, step]);

  const closeModal = () => onOpenChange(false);

  const startTimer = () => {
    setTimer(60);
    setCanResend(false);
  };

  const handleGoogle = () => {
    setLoading(true);
    const callbackUrl = `${window.location.origin}/oauth-callback`;
    window.location.href = `${API_BASE_URL}/api/auth/google/redirect?callback=${encodeURIComponent(
      callbackUrl,
    )}`;
  };

  const goPhoneStep = (flow: OtpFlow) => {
    setOtpFlow(flow);
    setOtp("");
    setStep("phone");
  };

  const sendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneHasEnoughDigits(phone)) {
      toast.error("Telefon numarasini tam girin");
      return;
    }
    setLoading(true);
    const result = await authService.sendOtpRequest(phone);
    setLoading(false);
    if (!result.success) return;
    setStep("otp");
    setOtp("");
    startTimer();
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4) return;
    setLoading(true);

    if (otpFlow === "login") {
      const result = await authService.verifyOtpForLogin(
        phone,
        otp,
        navigate,
      );
      setLoading(false);

      if (result?.shouldShowRegister) {
        setIntent("register");
        setOtpFlow("register");
        setVerifiedPhone(result.phoneNumber || authService.formatPhoneNumber(phone));
        setStep("register");
        return;
      }

      if (result?.success && result?.shouldNavigate) {
        closeModal();
      }
      return;
    }

    const result = await authService.verifyOtpForSignup(phone, otp, navigate);
    setLoading(false);
    if (result.success && !result.shouldNavigate && !result.shouldRedirectToLogin) {
      setVerifiedPhone(result.phoneNumber || authService.formatPhoneNumber(phone));
      setStep("register");
    }
  };

  const loginWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await authService.loginWithCredentials(
      {
        name: passwordLogin.identifier.trim(),
        password: passwordLogin.password,
      },
      navigate,
    );
    setLoading(false);
    if (result?.success) closeModal();
  };

  const sendResetOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneHasEnoughDigits(resetForm.phone)) {
      toast.error("Telefon numarasini tam girin");
      return;
    }

    setLoading(true);
    const result = await authService.requestPasswordReset(resetForm.phone);
    setLoading(false);
    if (!result.success) return;

    setResetForm((prev) => ({ ...prev, otp: "", newPassword: "", confirmPassword: "" }));
    setStep("resetOtp");
    startTimer();
  };

  const confirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetForm.newPassword.trim().length < 6) {
      toast.error("Sifre en az 6 karakter olmali");
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      toast.error("Sifreler ayni degil");
      return;
    }

    setLoading(true);
    const result = await authService.confirmPasswordReset(
      resetForm.phone,
      resetForm.otp,
      resetForm.newPassword,
    );
    setLoading(false);
    if (!result.success) return;

    setPasswordLogin((prev) => ({
      ...prev,
      identifier: authService.formatPhoneNumber(resetForm.phone),
      password: "",
    }));
    setStep("passwordLogin");
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectivePhone = verifiedPhone || authService.formatPhoneNumber(phone);
    if (!effectivePhone) {
      toast.error("Telefon dogrulamasi tekrar gerekli");
      setStep("phone");
      return;
    }
    if (registerForm.password.trim().length < 6) {
      toast.error("Sifre en az 6 karakter olmali");
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error("Sifreler ayni degil");
      return;
    }

    setLoading(true);
    const result = await authService.registerUser(
      {
        name: registerForm.name.trim(),
        userName: registerForm.userName.trim(),
        password: registerForm.password,
        phoneNumber: effectivePhone,
        avatarUrl: "",
        accountType: "STUDENT",
      },
      navigate,
    );
    setLoading(false);
    if (result?.success) closeModal();
  };

  if (!open) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="relative w-full max-w-[460px] max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          aria-label="Kapat"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-center text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle ? <p className="mt-2 text-center text-sm text-gray-600">{subtitle}</p> : null}

        {step === "method" ? (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setIntent("login")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  intent === "login"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Giris
              </button>
              <button
                type="button"
                onClick={() => setIntent("register")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  intent === "register"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Kayit
              </button>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
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
              {intent === "register" ? "Google ile Kayit" : "Google ile Giris"}
            </button>

            <button
              type="button"
              onClick={() => goPhoneStep(intent === "register" ? "register" : "login")}
              className="h-12 w-full rounded-lg bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Telefon ile Devam Et
            </button>

            {intent === "login" ? (
              <button
                type="button"
                onClick={() => setStep("passwordLogin")}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Sifre ile Giris
              </button>
            ) : (
              <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Kayit icin telefon dogrulama ve profil bilgileri yeterlidir.
              </p>
            )}
          </div>
        ) : null}

        {step === "passwordLogin" ? (
          <form onSubmit={loginWithPassword} className="mt-6 space-y-4">
            <button
              type="button"
              onClick={() => setStep("method")}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Geri
            </button>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Kullanici adi veya telefon
              </label>
              <input
                type="text"
                value={passwordLogin.identifier}
                onChange={(e) =>
                  setPasswordLogin((prev) => ({ ...prev, identifier: e.target.value }))
                }
                required
                className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none transition focus:border-red-500"
                placeholder="ornek: ali123 veya 998901234567"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Sifre</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordLogin.password}
                  onChange={(e) =>
                    setPasswordLogin((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  className="h-11 w-full rounded-lg border border-gray-300 px-3 pr-10 outline-none transition focus:border-red-500"
                  placeholder="Sifrenizi girin"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                  aria-label="Sifre goster/gizle"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-lg bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Giris yapiliyor..." : "Giris Yap"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep("resetPhone")}
                className="text-gray-600 hover:text-red-600"
              >
                Sifremi unuttum
              </button>
              <button
                type="button"
                onClick={() => goPhoneStep("login")}
                className="text-gray-600 hover:text-red-600"
              >
                Telefon OTP ile giris
              </button>
            </div>
          </form>
        ) : null}

        {step === "phone" ? (
          <form onSubmit={sendOtp} className="mt-6 space-y-4">
            <button
              type="button"
              onClick={() => setStep("method")}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Geri
            </button>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Telefon</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneForInput(e.target.value))}
                required
                className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none transition focus:border-red-500"
                placeholder="+998 90 123 45 67"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-lg bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Kod gonderiliyor..." : "OTP Gonder"}
            </button>
          </form>
        ) : null}

        {step === "otp" ? (
          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Geri
            </button>

            <p className="text-center text-sm text-gray-600">
              {phone} numarasina gelen 4 haneli kodu girin
            </p>

            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                value={otp}
                onChange={setOtp}
              >
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 4}
              className="h-12 w-full rounded-lg bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Dogrulaniyor..." : "Dogrula"}
            </button>

            <div className="text-center text-sm text-gray-500">
              {timer > 0 ? (
                <>Tekrar gonder: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}</>
              ) : (
                <button
                  type="button"
                  disabled={loading || !canResend}
                  onClick={() => sendOtp()}
                  className="text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Kodu tekrar gonder
                </button>
              )}
            </div>
          </form>
        ) : null}

        {step === "register" ? (
          <form onSubmit={register} className="mt-6 space-y-4">
            <button
              type="button"
              onClick={() => setStep("otp")}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Geri
            </button>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              Dogrulanan telefon: <span className="font-semibold">{verifiedPhone || authService.formatPhoneNumber(phone)}</span>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Ad Soyad</label>
              <input
                type="text"
                required
                value={registerForm.name}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none transition focus:border-red-500"
                placeholder="Adinizi girin"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Kullanici Adi</label>
              <input
                type="text"
                required
                value={registerForm.userName}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, userName: e.target.value }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none transition focus:border-red-500"
                placeholder="ornek: ali_ogretmen"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Sifre</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 px-3 pr-10 outline-none transition focus:border-red-500"
                  placeholder="En az 6 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                  aria-label="Sifre goster/gizle"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Sifre Tekrar</label>
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={registerForm.confirmPassword}
                onChange={(e) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none transition focus:border-red-500"
                placeholder="Sifreyi tekrar yazin"
              />
            </div>

            <p className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-700">
              Bu sifre ile giris yapabilirsiniz. Unutursaniz telefon OTP ile giris
              yapabilir veya "Sifremi unuttum" adimini kullanabilirsiniz.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-lg bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Hesap olusturuluyor..." : "Hesap Olustur"}
            </button>
          </form>
        ) : null}

        {step === "resetPhone" ? (
          <form onSubmit={sendResetOtp} className="mt-6 space-y-4">
            <button
              type="button"
              onClick={() => setStep("passwordLogin")}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Geri
            </button>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Telefon
              </label>
              <input
                type="tel"
                value={resetForm.phone}
                onChange={(e) =>
                  setResetForm((prev) => ({
                    ...prev,
                    phone: formatPhoneForInput(e.target.value),
                  }))
                }
                required
                className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none transition focus:border-red-500"
                placeholder="+998 90 123 45 67"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-lg bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Kod gonderiliyor..." : "Kod Gonder"}
            </button>
          </form>
        ) : null}

        {step === "resetOtp" ? (
          <form onSubmit={confirmResetPassword} className="mt-6 space-y-4">
            <button
              type="button"
              onClick={() => setStep("resetPhone")}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Geri
            </button>

            <p className="text-center text-sm text-gray-600">
              {resetForm.phone} numarasina gelen OTP kodu ve yeni sifrenizi girin
            </p>

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
                  <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Yeni Sifre</label>
              <input
                type={showNewPassword ? "text" : "password"}
                value={resetForm.newPassword}
                onChange={(e) =>
                  setResetForm((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                required
                className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none transition focus:border-red-500"
                placeholder="En az 6 karakter"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Yeni Sifre Tekrar
              </label>
              <input
                type={showNewPassword ? "text" : "password"}
                value={resetForm.confirmPassword}
                onChange={(e) =>
                  setResetForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                required
                className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none transition focus:border-red-500"
                placeholder="Sifreyi tekrar yazin"
              />
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                resetForm.otp.length !== 4 ||
                resetForm.newPassword.trim().length < 6
              }
              className="h-12 w-full rounded-lg bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Sifre guncelleniyor..." : "Sifreyi Guncelle"}
            </button>

            <div className="text-center text-sm text-gray-500">
              {timer > 0 ? (
                <>Tekrar gonder: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}</>
              ) : (
                <button
                  type="button"
                  onClick={() => sendResetOtp()}
                  disabled={loading || !canResend}
                  className="text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Kodu tekrar gonder
                </button>
              )}
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
