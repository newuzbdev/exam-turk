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
import { NavLink } from "react-router";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";

const SignUp = () => {
  const [step, setStep] = useState<"form" | "otp" | "register">("form");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });
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

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      let phoneWithPrefix = formData.phone.trim();
      if (phoneWithPrefix.startsWith("+998")) {
        phoneWithPrefix = phoneWithPrefix.substring(1);
      } else if (phoneWithPrefix.startsWith("998")) {
        phoneWithPrefix = phoneWithPrefix;
      } else {
        phoneWithPrefix = `998${phoneWithPrefix}`;
      }

      await axiosPrivate.post("/api/otp/send", {
        phone: phoneWithPrefix,
        name: formData.name,
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
      let phoneWithPrefix = formData.phone.trim();
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
        name: formData.name,
        isSignUp: true,
      });

      if (
        response.data.message === "Kod muvaffaqiyatli tasdiqlandi" ||
        response.data.message?.includes("tasdiqlandi") ||
        response.status === 200 ||
        response.status === 201
      ) {
        setRegistrationData({
          ...registrationData,
          name: formData.name,
          phoneNumber: phoneWithPrefix,
        });
        toast.success("OTP doğrulandı");
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
        toast.success("Kayıt başarılı");
        window.location.href = "/";
      } else if (response.status === 200 || response.status === 201) {
        toast.success("Kayıt başarılı");
        window.location.href = "/login";
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
      className="min-h-screen flex items-center justify-center px-4 relative"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/25"></div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {step === "form"
              ? "Kayıt Ol"
              : step === "otp"
              ? "Kodu Girin"
              : "Hesabınızı Tamamlayın"}
          </h1>
          <p className="text-white text-2xl">
            {step === "form"
              ? "Hızlı ve kolay hesap oluşturun"
              : step === "otp"
              ? "Telefon numaranıza gönderilen kodu girin"
              : "Son adım! Hesabınızı tamamlayın"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {step === "form" ? (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Ad Soyad"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="h-11 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <Input
                  type="tel"
                  placeholder="Telefon numarası"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="h-11 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-medium"
                disabled={loading}
              >
                {loading ? "Gönderiliyor..." : "Devam Et"}
              </Button>
            </form>
          ) : step === "otp" ? (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("form")}
                className="mb-4 p-0 h-auto text-gray-600 hover:text-red-600"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri Dön
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-6">
                  {formData.phone.startsWith("+")
                    ? formData.phone
                    : formData.phone.startsWith("998")
                    ? `+${formData.phone}`
                    : `+998${formData.phone}`}{" "}
                  numarasına gönderilen kodu girin
                </p>

                <div className="flex justify-center mb-6">
                  <InputOTP
                    maxLength={4}
                    pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                    value={otp}
                    onChange={(value) => setOtp(value)}
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

              <Button
                type="submit"
                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-medium"
                disabled={loading || otp.length !== 4}
              >
                {loading ? "Doğrulanıyor..." : "Doğrula"}
              </Button>

              <div className="text-center">
                {timer > 0 ? (
                  <p className="text-sm text-gray-500">
                    Tekrar gönder: {Math.floor(timer / 60)}:
                    {(timer % 60).toString().padStart(2, "0")}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 p-0 h-auto"
                    onClick={() => handleFormSubmit()}
                    disabled={loading || !canResend}
                  >
                    Tekrar Gönder
                  </Button>
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
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
                  className="h-11 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
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
                  className="h-11 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
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
                  className="h-11 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
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
                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-medium"
                disabled={loading}
              >
                {loading ? "Hesap Oluşturuluyor..." : "Hesap Oluştur"}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-white">
            Zaten hesabınız var mı?{" "}
            <NavLink
              to="/login"
              className="text-red-600 hover:text-red-700 font-medium"
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
