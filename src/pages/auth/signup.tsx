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
import { NavLink, useNavigate } from "react-router";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";

const SignUp = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp" | "register">("phone");
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

      await axiosPrivate.post("/api/otp/send", {
        phone: phoneWithPrefix,
      });
      toast.success("OTP kodu gönderildi");
      setStep("otp");
      startTimer();
    } catch (error: any) {
      console.error("OTP send error:", error);
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
        isSignUp: true,
      });

      console.log("OTP verification response:", response.data);

      // Check if the response contains an access token (user already exists)
      if (response.data.accessToken) {
        // User already exists, log them in directly
        localStorage.setItem("accessToken", response.data.accessToken);
        toast.success("Giriş başarılı! Kullanıcı zaten mevcut.");
        navigate("/", { replace: true });
        return;
      }

      // OTP verified but user doesn't exist, proceed to registration
      if (
        response.data.message === "Kod muvaffaqiyatli tasdiqlandi" ||
        response.data.message?.includes("tasdiqlandi") ||
        response.status === 200 ||
        response.status === 201
      ) {
        setRegistrationData({
          ...registrationData,
          phoneNumber: phoneWithPrefix,
        });
        toast.success("OTP doğrulandı - Kayıt formunu doldurun");
        setStep("register");
      } else {
        toast.error("OTP doğrulanamadı");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "OTP doğrulanamadı");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const registrationPayload = {
        name: registrationData.name,
        password: registrationData.password,
        phoneNumber: registrationData.phoneNumber,
        userName: registrationData.userName,
        avatarUrl: registrationData.avatarUrl || "",
      };

      const response = await axiosPrivate.post(
        "/api/user/register",
        registrationPayload
      );

      if (response.data.accessToken) {
        localStorage.setItem("accessToken", response.data.accessToken);

        // Get user data from /api/auth/me after successful registration
        try {
          const userResponse = await axiosPrivate.get("/api/auth/me");
          if (userResponse.data) {
            toast.success(`Kayıt başarılı! Hoş geldiniz ${userResponse.data.name}!`);
            // Navigate to home page
            navigate("/", { replace: true });
          }
        } catch (userError) {
          // If getting user data fails, still redirect but with generic message
          toast.success("Kayıt başarılı! Hoş geldiniz!");
          navigate("/", { replace: true });
        }
      } else if (response.status === 200 || response.status === 201) {
        toast.success("Kayıt başarılı");
        navigate("/", { replace: true });
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.response?.data?.message || "Kayıt başarısız");
    } finally {
      setLoading(false);
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
            {step === "phone"
              ? "Kayıt Ol"
              : step === "otp"
              ? "Kodu Girin"
              : "Hesabınızı Tamamlayın"}
          </h1>
          <p className="text-white text-lg sm:text-xl lg:text-2xl xl:text-3xl">
            {step === "phone"
              ? "Telefon numaranızı girin"
              : step === "otp"
              ? "Telefon numaranıza gönderilen kodu girin"
              : "Son adım! Hesabınızı tamamlayın"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8 xl:p-10">
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4 lg:space-y-6">
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
          ) : step === "otp" ? (
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
                {loading ? "Doğrulanıyor..." : "Doğrula"}
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
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 lg:space-y-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("otp")}
                className="mb-4 p-0 h-auto text-gray-600 hover:text-red-600 text-sm sm:text-base lg:text-lg"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 mr-2" />
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
                className="w-full h-11 sm:h-12 lg:h-14 xl:h-16 bg-red-600 hover:bg-red-700 text-white font-medium text-sm sm:text-base lg:text-lg xl:text-xl"
                disabled={loading}
              >
                {loading ? "Hesap Oluşturuluyor..." : "Hesap Oluştur"}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-6 lg:mt-8 text-center">
          <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-white">
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
