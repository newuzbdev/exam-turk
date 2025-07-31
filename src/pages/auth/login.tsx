import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { ArrowLeft } from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";


const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"options" | "phone" | "otp">("options");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits except the + at the beginning
    let input = value;
    if (input.startsWith('+')) {
      input = '+' + input.substring(1).replace(/\D/g, '');
    } else {
      input = input.replace(/\D/g, '');
    }

    // Handle different input scenarios
    let digits = input.replace(/\D/g, '');

    // If no digits, return +998
    if (digits.length === 0) {
      return '+998 ';
    }

    // If starts with 998, keep it
    if (digits.startsWith('998')) {
      digits = digits;
    } else if (digits.startsWith('8') && digits.length > 1) {
      digits = '99' + digits;
    } else {
      digits = '998' + digits;
    }

    // Limit to 12 digits (998 + 9 digits)
    digits = digits.substring(0, 12);

    // Format as +998 91 570 66 42
    let formatted = '+998';
    if (digits.length > 3) {
      formatted += ' ' + digits.substring(3, 5);
    }
    if (digits.length > 5) {
      formatted += ' ' + digits.substring(5, 8);
    }
    if (digits.length > 8) {
      formatted += ' ' + digits.substring(8, 10);
    }
    if (digits.length > 10) {
      formatted += ' ' + digits.substring(10, 12);
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

    try {
      // Remove spaces and + sign, format phone number
      const cleanPhone = phone.replace(/[\s+]/g, '');
      let phoneWithPrefix = cleanPhone;

      if (phoneWithPrefix.startsWith("+998")) {
        phoneWithPrefix = phoneWithPrefix.substring(1);
      } else if (phoneWithPrefix.startsWith("998")) {
        phoneWithPrefix = phoneWithPrefix;
      } else {
        phoneWithPrefix = `998${phoneWithPrefix}`;
      }

      await axiosPrivate.post("/api/otp/send", { phone: phoneWithPrefix });
      toast.success("OTP kodu gönderildi");
      setStep("otp");
      startTimer();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "OTP gönderilemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Remove spaces and + sign, format phone number
      const cleanPhone = phone.replace(/[\s+]/g, '');
      let phoneWithPrefix = cleanPhone;

      if (phoneWithPrefix.startsWith("+998")) {
        phoneWithPrefix = phoneWithPrefix.substring(1);
      } else if (phoneWithPrefix.startsWith("998")) {
        phoneWithPrefix = phoneWithPrefix;
      } else {
        phoneWithPrefix = `998${phoneWithPrefix}`;
      }

      const response = await axiosPrivate.post("/api/otp/verify", {
        phoneNumber: phoneWithPrefix,
        code: otp.toString(),
      });

      if (response.data.accessToken) {
        localStorage.setItem("accessToken", response.data.accessToken);



        toast.success("Giriş başarılı");
        navigate("/", { replace: true });
      } else if (response.data.message || response.status === 200) {
        toast.success("Giriş başarılı");
        navigate("/", { replace: true });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "OTP doğrulanamadı");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    // Redirect to Google OAuth with proper callback URL
    const baseUrl = import.meta.env.VITE_API_URL || "https://api.turkcetest.uz";
    const callbackUrl = `${window.location.origin}/oauth-callback`;
    window.location.href = `${baseUrl}/api/auth/google/redirect?callback=${encodeURIComponent(callbackUrl)}`;
  };



  const getTitle = () => {
    switch (step) {
      case "options":
        return "Giriş Yap";
      case "phone":
        return "Telefon Numarası";
      case "otp":
        return "Kodu Girin";
      default:
        return "Giriş Yap";
    }
  };

  const getDescription = () => {
    switch (step) {
      case "options":
        return "Hesabınıza giriş yapın";
      case "phone":
        return "Telefon numaranızı girin";
      case "otp":
        return "Size gönderilen kodu girin";
      default:
        return "";
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
        <div className="text-center mb-6 sm:mb-8 lg:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-2 lg:mb-4">
            {getTitle()}
          </h1>
          <p className="text-gray-200 text-lg sm:text-xl lg:text-2xl xl:text-3xl">{getDescription()}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8 xl:p-10">
          {step === "options" ? (
            <div className="space-y-4">
              {/* Google Login */}
              <Button
                onClick={handleGoogleLogin}
                className="w-full h-14 sm:h-16 lg:h-18 xl:h-20 bg-white hover:bg-gray-50 text-gray-700 font-medium text-base sm:text-lg lg:text-xl xl:text-2xl border border-gray-300 hover:border-gray-400 flex items-center justify-center gap-3"
                disabled={loading}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? "Yükleniyor..." : "Google ile Giriş Yap"}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs sm:text-sm lg:text-base uppercase">
                  <span className="bg-white px-4 text-gray-500 font-medium">
                    veya
                  </span>
                </div>
              </div>

              {/* Phone Login Button */}
              <Button
                onClick={() => setStep("phone")}
                className="w-full h-14 sm:h-16 lg:h-18 xl:h-20 bg-red-600 hover:bg-red-700 text-white font-medium text-sm sm:text-base lg:text-lg xl:text-xl"
                disabled={loading}
              >
                {loading ? "Yükleniyor..." : "Telefon ile Giriş Yap"}
              </Button>
            </div>
          ) : step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4 lg:space-y-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("options")}
                className="mb-4 p-0 h-auto text-gray-600 hover:text-red-600 text-sm sm:text-base lg:text-lg"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 mr-2" />
                Geri Dön
              </Button>

              <div>
                <Input
                  type="tel"
                  placeholder="+998 91 570 66 42"
                  value={phone || '+998 '}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  className="h-11 sm:h-12 lg:h-14 xl:h-16 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm sm:text-base lg:text-lg xl:text-xl"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 sm:h-12 lg:h-14 xl:h-16 bg-red-600 hover:bg-red-700 text-white font-medium text-sm sm:text-base lg:text-lg xl:text-xl"
                disabled={loading}
              >
                {loading ? "Gönderiliyor..." : "Devam Et"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6 lg:space-y-8">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("phone")}
                className="mb-4 p-0 h-auto text-gray-600 hover:text-red-600 text-sm sm:text-base lg:text-lg"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 mr-2" />
                Geri Dön
              </Button>

              <div className="text-center">
                <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-600 mb-6 lg:mb-8">
                  {phone}{" "}
                  numarasına gönderilen kodu girin
                </p>

                <div className="flex justify-center mb-6 lg:mb-8">
                  <InputOTP
                    maxLength={4}
                    pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                    value={otp}
                    onChange={(value) => setOtp(value)}
                  >
                    <InputOTPGroup className="gap-2 sm:gap-3 lg:gap-4">
                      <InputOTPSlot
                        index={0}
                        className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 text-lg sm:text-xl lg:text-2xl xl:text-3xl font-semibold border-gray-200 focus:border-red-500"
                      />
                      <InputOTPSlot
                        index={1}
                        className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 text-lg sm:text-xl lg:text-2xl xl:text-3xl font-semibold border-gray-200 focus:border-red-500"
                      />
                      <InputOTPSlot
                        index={2}
                        className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 text-lg sm:text-xl lg:text-2xl xl:text-3xl font-semibold border-gray-200 focus:border-red-500"
                      />
                      <InputOTPSlot
                        index={3}
                        className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 text-lg sm:text-xl lg:text-2xl xl:text-3xl font-semibold border-gray-200 focus:border-red-500"
                      />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 sm:h-12 lg:h-14 xl:h-16 bg-red-600 hover:bg-red-700 text-white font-medium text-sm sm:text-base lg:text-lg xl:text-xl"
                disabled={loading || otp.length !== 4}
              >
                {loading ? "Doğrulanıyor..." : "Giriş Yap"}
              </Button>

              <div className="text-center">
                {timer > 0 ? (
                  <p className="text-sm sm:text-base lg:text-lg text-gray-500">
                    Tekrar gönder: {Math.floor(timer / 60)}:
                    {(timer % 60).toString().padStart(2, "0")}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 p-0 h-auto text-sm sm:text-base lg:text-lg"
                    onClick={() => handleSendOtp()}
                    disabled={loading || !canResend}
                  >
                    Tekrar Gönder
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 lg:mt-8 text-center">
          <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-white">
            Hesabınız yok mu?{" "}
            <NavLink
              to="/signup"
              className="text-red-600 hover:text-red-700 font-medium underline"
            >
              Kayıt Ol
            </NavLink>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
