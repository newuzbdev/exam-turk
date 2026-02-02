import { useState, useEffect, useRef } from "react";
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
import { authService } from "@/services/auth.service";

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp" | "login">("phone");
  const [phone, setPhone] = useState("");
  const phoneRef = useRef(""); // Store verified phone number
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [loginData, setLoginData] = useState({
    name: "",
    password: "",
    userName: "",
    phoneNumber: "",
    avatarUrl: "",
  });
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

  // Sync phone number to loginData when step changes to "login"
  useEffect(() => {
    if (step === "login") {
      const storedPhone = sessionStorage.getItem('signupPhone') || phoneRef.current;
      if (storedPhone) {
        setLoginData(prev => ({
          ...prev,
          phoneNumber: storedPhone
        }));
      }
    }
  }, [step]);

  const startTimer = () => {
    setTimer(60);
    setCanResend(false);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    const result = await authService.sendOtpRequest(phone);
    if (result.success) {
      const formattedPhone = authService.formatPhoneNumber(phone);
      phoneRef.current = formattedPhone;
      sessionStorage.setItem('signupPhone', formattedPhone);
      setStep("otp");
      startTimer();
    }

    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await authService.verifyOtpForLogin(phone, otp.toString(), navigate);
    
    if (result.success && result.shouldShowRegister) {
      // Store phone in sessionStorage for registration
      const formattedPhone = authService.formatPhoneNumber(phone);
      phoneRef.current = formattedPhone;
      sessionStorage.setItem('signupPhone', formattedPhone);
      setStep("login");
    }
    
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Get phone from loginData (set by useEffect when step changes to "login")
    const phoneForRegistration = loginData.phoneNumber || sessionStorage.getItem('signupPhone') || phoneRef.current;
    console.log("DEBUG handleLogin - phoneForRegistration:", phoneForRegistration);
    console.log("DEBUG handleLogin - loginData.phoneNumber:", loginData.phoneNumber);
    console.log("DEBUG handleLogin - sessionStorage:", sessionStorage.getItem('signupPhone'));
    console.log("DEBUG handleLogin - phoneRef.current:", phoneRef.current);
    
    await authService.registerUser(
      {
        name: loginData.name,
        password: loginData.password,
        phoneNumber: phoneForRegistration.replace(/[\s+]/g, ""),
        userName: loginData.userName,
        avatarUrl: loginData.avatarUrl,
      },
      navigate
    );

    setLoading(false);
  };

  const getTitle = () => {
    switch (step) {
      case "phone":
        return "Telefon Numarası";
      case "otp":
        return "Kodu Girin";
      case "login":
        return "Giriş Yap";
      default:
        return "Giriş Yap";
    }
  };

  const getDescription = () => {
    switch (step) {
      case "phone":
        return "Telefon numaranızı girin";
      case "otp":
        return "Size gönderilen kodu girin";
      case "login":
        return "Adınız ve şifreniz ile giriş yapın";
      default:
        return "Adınız ve şifreniz ile giriş yapın";
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
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4 lg:space-y-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("login")}
                className="mb-4 p-0 h-auto text-gray-600 hover:text-red-600"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 mr-2" />
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
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 mr-2" />
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
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium"
                disabled={loading || otp.length !== 4}
              >
                {loading ? "Doğrulanıyor..." : "Giriş Yap"}
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
                    className="text-red-600 hover:text-red-700 p-0 h-auto"
                    onClick={() => handleSendOtp()}
                    disabled={loading || !canResend}
                  >
                    Tekrar Gönder
                  </Button>
                )}
              </div>
            </form>
          ) : step === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4 lg:space-y-6">
              <div>
                <Input
                  type="text"
                  placeholder="Adınız"
                  value={loginData.name}
                  onChange={(e) =>
                    setLoginData({ ...loginData, name: e.target.value })
                  }
                  className="h-11 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <Input
                  type="email"
                  placeholder="E-posta adresiniz"
                  value={loginData.userName}
                  onChange={(e) =>
                    setLoginData({ ...loginData, userName: e.target.value })
                  }
                  className="h-11 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Şifreniz"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  className="h-11 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium"
                disabled={loading}
              >
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </Button>
            </form>
          ) : null}
        </div>

        <div className="mt-8 text-center">
          <p className="text-white">
            Hesabınız yok mu?{" "}
            <NavLink
              to="/signup"
              className="text-white hover:text-red-700 font-medium underline"
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
