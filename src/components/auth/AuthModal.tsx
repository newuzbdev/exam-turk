import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "login" | "register";
}

const AuthModal = ({ open, onOpenChange, initialMode = "login" }: AuthModalProps) => {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<"login" | "register">(initialMode);
  const [registerMethod, setRegisterMethod] = useState<"email" | "phone">("email");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login states
  const [loginStep, setLoginStep] = useState<"login" | "phone" | "otp">("login");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginData, setLoginData] = useState({
    name: "",
    password: "",
  });
  
  // Register states
  const [registerStep, setRegisterStep] = useState<"options" | "phone" | "otp" | "register">("options");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerOtp, setRegisterOtp] = useState("");
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    phoneNumber: "",
    userName: "",
  });
  
  // Timer states
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Sync authMode with initialMode when modal opens or parent changes mode (e.g. "Kayıt Ol" vs "Giriş Yap")
  useEffect(() => {
    if (open) {
      setAuthMode(initialMode);
      if (initialMode === "register") {
        setRegisterStep("options");
      } else {
        setLoginStep("login");
      }
    }
  }, [open, initialMode]);

  // Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    let input = value;
    if (input.startsWith("+")) {
      input = "+" + input.substring(1).replace(/\D/g, "");
    } else {
      input = input.replace(/\D/g, "");
    }

    let digits = input.replace(/\D/g, "");

    if (digits.length === 0) {
      return "+998 ";
    }

    if (digits.startsWith("998")) {
      digits = digits;
    } else if (digits.startsWith("8") && digits.length > 1) {
      digits = "99" + digits;
    } else {
      digits = "998" + digits;
    }

    digits = digits.substring(0, 12);

    let formatted = "+998";
    if (digits.length > 3) {
      formatted += " " + digits.substring(3, 5);
    }
    if (digits.length > 5) {
      formatted += " " + digits.substring(5, 8);
    }
    if (digits.length > 8) {
      formatted += " " + digits.substring(8, 10);
    }
    if (digits.length > 10) {
      formatted += " " + digits.substring(10, 12);
    }

    return formatted;
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
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
    return () => clearInterval(interval);
  }, [timer]);

  const startTimer = () => {
    setTimer(60);
    setCanResend(false);
  };

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (open) {
      setAuthMode(initialMode);
      setRegisterMethod("email");
      setLoginStep("login");
      setRegisterStep("options");
      setLoginData({ name: "", password: "" });
      setRegisterData({ name: "", email: "", phone: "", password: "", phoneNumber: "", userName: "" });
      setLoginPhone("");
      setRegisterPhone("");
      setLoginOtp("");
      setRegisterOtp("");
      setShowPassword(false);
      setTimer(0);
      setCanResend(false);
    }
  }, [open, initialMode]);

  // Login handlers
  const handleLoginPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await authService.sendOtpRequest(loginPhone);
    if (result.success) {
      setLoginStep("otp");
      startTimer();
    }
    setLoading(false);
  };

  const handleLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await authService.verifyOtpForLogin(
      loginPhone,
      loginOtp.toString(),
      navigate
    );
    setLoading(false);
    if (result?.shouldShowRegister && result?.phoneNumber) {
      setRegisterPhone(loginPhone);
      setRegisterData((prev) => ({
        ...prev,
        phoneNumber: result.phoneNumber!,
      }));
      setAuthMode("register");
      setRegisterStep("register");
      return;
    }
    if (result?.success && result?.shouldNavigate) {
      onOpenChange(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await authService.loginWithCredentials(
      { name: loginData.name, password: loginData.password },
      navigate
    );
    setLoading(false);
    if (result?.success && open) {
      onOpenChange(false);
    }
  };

  // Register handlers
  const handleGoogleLogin = () => {
    setLoading(true);
    const baseUrl = import.meta.env.VITE_API_URL || "https://api.turkishmock.uz";
    const callbackUrl = `${window.location.origin}/oauth-callback`;
    window.location.href = `${baseUrl}/api/auth/google/redirect?callback=${encodeURIComponent(
      callbackUrl
    )}`;
  };

  const handleRegisterPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await authService.sendOtpRequest(registerPhone);
    if (result.success) {
      setRegisterStep("otp");
      startTimer();
    }
    setLoading(false);
  };

  const handleRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await authService.verifyOtpForSignup(
      registerPhone,
      registerOtp.toString(),
      navigate
    );

    if (result.success && !result.shouldNavigate && !result.shouldRedirectToLogin) {
      const phoneNumber = result.phoneNumber || authService.formatPhoneNumber(registerPhone);
      setRegisterData({
        ...registerData,
        phoneNumber,
      });
      setRegisterStep("register");
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Get the phone number from registerData (set during OTP verification)
    const phoneNumber = registerData.phoneNumber || authService.formatPhoneNumber(registerPhone);
    
    // Validate userName is not empty
    const userName = registerMethod === "email" ? registerData.email : registerData.userName;
    if (!userName || userName.trim() === "") {
      toast.error("Kullanıcı adı boş olamaz");
      setLoading(false);
      return;
    }
    
    const registrationPayload = {
      name: registerData.name,
      password: registerData.password,
      phoneNumber: phoneNumber,
      userName: userName,
      avatarUrl: "",
    };

    console.log("DEBUG handleRegister - registrationPayload:", registrationPayload);

    const result = await authService.registerUser(registrationPayload, navigate);
    setLoading(false);
    if (result?.success && open) {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200 min-h-screen"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div className="bg-white rounded-[12px] shadow-2xl w-full max-w-[440px] max-h-[90vh] overflow-y-auto p-8 relative animate-in zoom-in-95 duration-200 mx-auto">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-5 right-5 text-[#333333] hover:text-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          {authMode === "login" 
            ? loginStep === "phone" 
              ? "Telefon Numarası"
              : loginStep === "otp"
              ? "Kodu Girin"
              : "Giriş Yap"
            : registerStep === "options"
            ? "Kayıt Ol"
            : registerStep === "phone"
            ? "Telefon Numarası"
            : registerStep === "otp"
            ? "Kodu Girin"
            : "Hesabınızı Tamamlayın"}
        </h2>

        {/* Login Flow */}
        {authMode === "login" && (
          <>
            {loginStep === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    required
                    value={loginData.name}
                    onChange={(e) =>
                      setLoginData({ ...loginData, name: e.target.value })
                    }
                    placeholder="Kullanıcı adı veya telefon"
                    className="w-full bg-white border border-[#E5E5E5] text-gray-900 rounded-lg p-3 outline-none focus:border-black transition-colors placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Şifre
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData({ ...loginData, password: e.target.value })
                      }
                      className="w-full bg-white border border-[#E5E5E5] text-gray-900 rounded-lg p-3 pr-10 outline-none focus:border-black transition-colors placeholder-gray-400"
                      placeholder="Şifreniz"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 text-gray-500">veya</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLoginStep("phone")}
                  className="w-full text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
                >
                  Telefon ile Giriş Yap
                </button>
              </form>
            )}

            {loginStep === "phone" && (
              <form onSubmit={handleLoginPhone} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setLoginStep("login")}
                  className="mb-2 text-gray-600 hover:text-red-600 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Geri Dön
                </button>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Telefon Numarası
                  </label>
                  <input
                    type="tel"
                    required
                    value={loginPhone || "+998 "}
                    onChange={(e) => setLoginPhone(formatPhoneNumber(e.target.value))}
                    placeholder="+998 91 570 66 42"
                    className="w-full bg-white border border-[#E5E5E5] text-gray-900 rounded-lg p-3 outline-none focus:border-black transition-colors placeholder-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Gönderiliyor..." : "Devam Et"}
                </button>
              </form>
            )}

            {loginStep === "otp" && (
              <form onSubmit={handleLoginOtp} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setLoginStep("phone")}
                  className="mb-2 text-gray-600 hover:text-red-600 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Geri Dön
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-6">
                    {loginPhone} numarasına gönderilen kodu girin
                  </p>

                  <div className="flex justify-center mb-6">
                    <InputOTP
                      maxLength={4}
                      pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                      value={loginOtp}
                      onChange={(value) => setLoginOtp(value)}
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot
                          index={0}
                          className="w-12 h-12 text-lg font-semibold border-gray-200 focus:border-red-500"
                        />
                        <InputOTPSlot
                          index={1}
                          className="w-12 h-12 text-lg font-semibold border-gray-200 focus:border-red-500"
                        />
                        <InputOTPSlot
                          index={2}
                          className="w-12 h-12 text-lg font-semibold border-gray-200 focus:border-red-500"
                        />
                        <InputOTPSlot
                          index={3}
                          className="w-12 h-12 text-lg font-semibold border-gray-200 focus:border-red-500"
                        />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || loginOtp.length !== 4}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Doğrulanıyor..." : "Giriş Yap"}
                </button>

                <div className="text-center">
                  {timer > 0 ? (
                    <p className="text-sm text-gray-500">
                      Tekrar gönder: {Math.floor(timer / 60)}:
                      {(timer % 60).toString().padStart(2, "0")}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleLoginPhone(e)}
                      disabled={loading || !canResend}
                      className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Tekrar Gönder
                    </button>
                  )}
                </div>
              </form>
            )}
          </>
        )}

        {/* Register Flow */}
        {authMode === "register" && (
          <>
            {registerStep === "options" && (
              <div className="space-y-4">
                {/* Google Login */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-300 hover:border-gray-400 flex items-center justify-center gap-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                  {loading ? "Yükleniyor..." : "Google ile Kayıt Ol"}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 text-gray-500">veya</span>
                  </div>
                </div>

                <div className="flex border-b border-gray-200 mb-6">
                  <button
                    onClick={() => {
                      setRegisterMethod("email");
                      setRegisterStep("register");
                    }}
                    className={`flex-1 pb-3 text-sm font-semibold transition-all ${
                      registerMethod === "email"
                        ? "text-black border-b-2 border-black"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                  Kullanıcı adı

                  </button>
                  <button
                    onClick={() => setRegisterStep("phone")}
                    className={`flex-1 pb-3 text-sm font-semibold transition-all ${
                      registerMethod === "phone"
                        ? "text-black border-b-2 border-black"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    Telefon ile
                  </button>
                </div>
              </div>
            )}

            {registerStep === "phone" && (
              <form onSubmit={handleRegisterPhone} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setRegisterStep("options")}
                  className="mb-2 text-gray-600 hover:text-red-600 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Geri Dön
                </button>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Telefon Numarası
                  </label>
                  <input
                    type="tel"
                    required
                    value={registerPhone || "+998 "}
                    onChange={(e) => setRegisterPhone(formatPhoneNumber(e.target.value))}
                    placeholder="+998 91 570 66 42"
                    className="w-full bg-white border border-[#E5E5E5] text-gray-900 rounded-lg p-3 outline-none focus:border-black transition-colors placeholder-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Gönderiliyor..." : "Devam Et"}
                </button>
              </form>
            )}

            {registerStep === "otp" && (
              <form onSubmit={handleRegisterOtp} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setRegisterStep("phone")}
                  className="mb-2 text-gray-600 hover:text-red-600 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Geri Dön
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-6">
                    {registerPhone} numarasına gönderilen kodu girin
                  </p>

                  <div className="flex justify-center mb-6">
                    <InputOTP
                      maxLength={4}
                      pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                      value={registerOtp}
                      onChange={(value) => setRegisterOtp(value)}
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot
                          index={0}
                          className="w-12 h-12 text-lg font-semibold border-gray-200 focus:border-red-500"
                        />
                        <InputOTPSlot
                          index={1}
                          className="w-12 h-12 text-lg font-semibold border-gray-200 focus:border-red-500"
                        />
                        <InputOTPSlot
                          index={2}
                          className="w-12 h-12 text-lg font-semibold border-gray-200 focus:border-red-500"
                        />
                        <InputOTPSlot
                          index={3}
                          className="w-12 h-12 text-lg font-semibold border-gray-200 focus:border-red-500"
                        />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || registerOtp.length !== 4}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Doğrulanıyor..." : "Devam Et"}
                </button>

                <div className="text-center">
                  {timer > 0 ? (
                    <p className="text-sm text-gray-500">
                      Tekrar gönder: {Math.floor(timer / 60)}:
                      {(timer % 60).toString().padStart(2, "0")}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleRegisterPhone(e)}
                      disabled={loading || !canResend}
                      className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Tekrar Gönder
                    </button>
                  )}
                </div>
              </form>
            )}

            {registerStep === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                {registerMethod === "phone" && (
                  <button
                    type="button"
                    onClick={() => setRegisterStep("otp")}
                    className="mb-2 text-gray-600 hover:text-red-600 transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Geri Dön
                  </button>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    required
                    value={registerData.name}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, name: e.target.value })
                    }
                    className="w-full bg-white border border-[#E5E5E5] text-gray-900 rounded-lg p-3 outline-none focus:border-black transition-colors placeholder-gray-400"
                    placeholder="Adınız ve soyadınız"
                  />
                </div>

                {registerMethod === "email" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Kullanıcı adı

                    </label>
                    <input
                      type="text"
                      required
                      value={registerData.email}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, email: e.target.value })
                      }
                      className="w-full bg-white border border-[#E5E5E5] text-gray-900 rounded-lg p-3 outline-none focus:border-black transition-colors placeholder-gray-400"
                      placeholder="Kullanıcı adı adresiniz"
                    />
                  </div>
                )}

                {registerMethod === "phone" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Kullanıcı Adı
                    </label>
                    <input
                      type="text"
                      required
                      value={registerData.userName || ""}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, userName: e.target.value })
                      }
                      className="w-full bg-white border border-[#E5E5E5] text-gray-900 rounded-lg p-3 outline-none focus:border-black transition-colors placeholder-gray-400"
                      placeholder="Kullanıcı adınız"
                    />
                  </div>
                )}



                {(registerMethod === "email" || registerStep === "register") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Şifre
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={registerData.password}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            password: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-[#E5E5E5] text-gray-900 rounded-lg p-3 pr-10 outline-none focus:border-black transition-colors placeholder-gray-400"
                        placeholder="Şifreniz"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Kayıt olunuyor..." : "Kayıt Ol"}
                </button>
              </form>
            )}
          </>
        )}

        {/* Mode Switch */}
        {(authMode === "login" && loginStep === "login") ||
        (authMode === "register" && registerStep === "options") ||
        (authMode === "register" && registerStep === "register" && registerMethod === "email") ? (
          <div className="mt-6 text-center">
            {authMode === "login" ? (
              <p className="text-sm text-gray-500">
                Hesabın yok mu?{" "}
                <button
                  onClick={() => {
                    setAuthMode("register");
                    setRegisterStep("options");
                  }}
                  className="font-bold text-black hover:text-red-600 transition-colors"
                >
                  Kayıt ol
                </button>
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Zaten hesabın var mı?{" "}
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setLoginStep("login");
                  }}
                  className="font-bold text-black hover:text-red-600 transition-colors"
                >
                  Giriş yap
                </button>
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AuthModal;
