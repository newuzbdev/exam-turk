import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { authService } from "@/services/auth.service";

const SignUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<"options" | "phone" | "otp" | "register">(
    "options"
  );
  const [phone, setPhone] = useState("");
  const [registrationData, setRegistrationData] = useState({
    name: "",
    password: "",
    phoneNumber: "",
    avatarUrl: "",
    userName: "",
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits except the + at the beginning
    let input = value;
    if (input.startsWith("+")) {
      input = "+" + input.substring(1).replace(/\D/g, "");
    } else {
      input = input.replace(/\D/g, "");
    }

    // Handle different input scenarios
    let digits = input.replace(/\D/g, "");

    // If no digits, return +998
    if (digits.length === 0) {
      return "+998 ";
    }

    // If starts with 998, keep it
    if (digits.startsWith("998")) {
      digits = digits;
    } else if (digits.startsWith("8") && digits.length > 1) {
      digits = "99" + digits;
    } else {
      digits = "998" + digits;
    }

    // Limit to 12 digits (998 + 9 digits)
    digits = digits.substring(0, 12);

    // Format as +998 91 570 66 42
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

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    const result = await authService.sendOtpRequest(phone);
    if (result.success) {
      setStep("otp");
      startTimer();
    }

    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await authService.verifyOtpForSignup(
      phone,
      otp.toString(),
      navigate
    );

    if (
      result.success &&
      result.phoneNumber &&
      !result.shouldNavigate &&
      !result.shouldRedirectToLogin
    ) {
      // OTP verified, proceed to registration
      setRegistrationData({
        ...registrationData,
        phoneNumber: result.phoneNumber,
      });
      setStep("register");
    }

    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const registrationPayload = {
      name: registrationData.name,
      password: registrationData.password,
      phoneNumber: registrationData.phoneNumber,
      userName: registrationData.userName,
      avatarUrl: registrationData.avatarUrl || "",
    };

    await authService.registerUser(registrationPayload, navigate);
    // After successful signup, redirect back if requested
    const state = location.state as { redirectTo?: string } | null;
    if (state?.redirectTo) {
      navigate(state.redirectTo);
      return;
    }
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    // Redirect to Google OAuth with proper callback URL
    const baseUrl = import.meta.env.VITE_API_URL || "https://api.turkcetest.uz";
    const callbackUrl = `${window.location.origin}/oauth-callback`;
    window.location.href = `${baseUrl}/api/auth/google/redirect?callback=${encodeURIComponent(
      callbackUrl
    )}`;
  };

  const getTitle = () => {
    switch (step) {
      case "options":
        return "Kayıt Ol";
      case "phone":
        return "Telefon Numarası";
      case "otp":
        return "Kodu Girin";
      case "register":
        return "Hesabınızı Tamamlayın";
      default:
        return "Kayıt Ol";
    }
  };

  const getDescription = () => {
    switch (step) {
      case "options":
        return "Hesap oluşturmak için bir yöntem seçin";
      case "phone":
        return "Telefon numaranızı girin";
      case "otp":
        return "Telefon numaranıza gönderilen kodu girin";
      case "register":
        return "Son adım! Hesabınızı tamamlayın";
      default:
        return "Hesap oluşturmak için bir yöntem seçin";
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/25"></div>

      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">{getTitle()}</h1>
          <p className="text-gray-200 text-lg">{getDescription()}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8 xl:p-10">
          {step === "options" ? (
            <div className="space-y-4">
              {/* Google Login */}
              <Button
                onClick={handleGoogleLogin}
                className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-300 hover:border-gray-400 flex items-center justify-center gap-3"
                disabled={loading}
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
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm uppercase">
                  <span className="bg-white px-4 text-gray-500 font-medium">
                    veya
                  </span>
                </div>
              </div>

              {/* Phone Signup Link */}
              <div className="text-center">
                <button
                  onClick={() => setStep("phone")}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700 underline cursor-pointer font-medium disabled:opacity-50"
                >
                  {loading ? "Yükleniyor..." : "Telefon ile Kayıt Ol"}
                </button>
              </div>
            </div>
          ) : step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4 lg:space-y-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("options")}
                className="mb-4 p-0 h-auto text-gray-600 hover:text-red-600"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri Dön
              </Button>

              <div>
                <Input
                  type="tel"
                  placeholder="+998 91 570 66 42"
                  value={phone || "+998 "}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  className="h-11 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium"
                disabled={loading}
              >
                {loading ? "Gönderiliyor..." : "Devam Et"}
              </Button>
            </form>
          ) : step === "otp" ? (
            <form onSubmit={handleVerifyOtp} className="space-y-6 lg:space-y-8">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("phone")}
                className="mb-4 p-0 h-auto text-gray-600 hover:text-red-600"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri Dön
              </Button>

              <div className="text-center">
                <p className="text-gray-600 mb-6 lg:mb-8">
                  {phone} numarasına gönderilen kodu girin
                </p>

                <div className="flex justify-center mb-6 lg:mb-8">
                  <InputOTP
                    maxLength={4}
                    pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                    value={otp}
                    onChange={(value) => setOtp(value)}
                  >
                    <InputOTPGroup className="gap-3">
                      <InputOTPSlot
                        index={0}
                        className="w-14 h-14 text-xl font-semibold border-gray-200 focus:border-red-500"
                      />
                      <InputOTPSlot
                        index={1}
                        className="w-14 h-14 text-xl font-semibold border-gray-200 focus:border-red-500"
                      />
                      <InputOTPSlot
                        index={2}
                        className="w-14 h-14 text-xl font-semibold border-gray-200 focus:border-red-500"
                      />
                      <InputOTPSlot
                        index={3}
                        className="w-14 h-14 text-xl font-semibold border-gray-200 focus:border-red-500"
                      />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium"
                disabled={loading || otp.length !== 4}
              >
                {loading ? "Doğrulanıyor..." : "Doğrula"}
              </Button>

              <div className="text-center">
                {timer > 0 ? (
                  <p className="text-gray-500">
                    Tekrar gönder: {Math.floor(timer / 60)}:
                    {(timer % 60).toString().padStart(2, "0")}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 p-0 h-auto cursor-pointer"
                    onClick={() => handleSendOtp()}
                    disabled={loading || !canResend}
                  >
                    Tekrar Gönder
                  </Button>
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 lg:space-y-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("otp")}
                className="mb-4 p-0 h-auto text-gray-600 hover:text-red-600"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri Dön
              </Button>

              <div>
                <Input
                  type="text"
                  placeholder="Ad Soyad"
                  value={registrationData.name}
                  onChange={(e) =>
                    setRegistrationData({
                      ...registrationData,
                      name: e.target.value,
                    })
                  }
                  className="h-11 sm:h-12 lg:h-14 xl:h-16 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm sm:text-base lg:text-lg xl:text-xl"
                  required
                />
              </div>

              <div>
                <Input
                  type="text"
                  placeholder="Kullanıcı adı"
                  value={registrationData.userName}
                  onChange={(e) =>
                    setRegistrationData({
                      ...registrationData,
                      userName: e.target.value,
                    })
                  }
                  className="h-11 sm:h-12 lg:h-14 xl:h-16 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm sm:text-base lg:text-lg xl:text-xl"
                  required
                />
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Şifre"
                  value={registrationData.password}
                  onChange={(e) =>
                    setRegistrationData({
                      ...registrationData,
                      password: e.target.value,
                    })
                  }
                  className="h-11 sm:h-12 lg:h-14 xl:h-16 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 pr-10 sm:pr-12 lg:pr-14 text-sm sm:text-base lg:text-lg xl:text-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 lg:right-5 top-3 sm:top-3.5 lg:top-4 xl:top-5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
                  ) : (
                    <Eye className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
                  )}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium"
                disabled={loading}
              >
                {loading ? "Hesap Oluşturuluyor..." : "Hesap Oluştur"}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-white">
            Zaten hesabınız var mı?{" "}
            <NavLink
              to="/login"
              className="text-red-600 hover:text-red-700 font-medium underline"
            >
              Giriş Yap
            </NavLink>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
