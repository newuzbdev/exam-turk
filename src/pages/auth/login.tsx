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
import { NavLink } from "react-router";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";
import { GoogleLogin } from "@react-oauth/google";

const Login = () => {
  const [step, setStep] = useState<"options" | "phone" | "otp">("options");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

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
      let phoneWithPrefix = phone.trim();
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
      let phoneWithPrefix = phone.trim();
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
        window.location.href = "/";
      } else if (response.data.message || response.status === 200) {
        toast.success("Giriş başarılı");
        window.location.href = "/";
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "OTP doğrulanamadı");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    try {
      const response = await axiosPrivate.post("/api/auth/google", {
        credential: credentialResponse.credential,
      });

      if (response.data.accessToken) {
        localStorage.setItem("accessToken", response.data.accessToken);
        toast.success("Google ile giriş başarılı");
        window.location.href = "/";
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Google ile giriş başarısız"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error("Google ile giriş başarısız");
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {getTitle()}
          </h1>
          <p className="text-gray-200 text-sm">{getDescription()}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {step === "options" ? (
            <div className="space-y-4">
              {/* Google Login */}
              <div className="w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  width="100%"
                  text="signin_with"
                  locale="tr"
                />
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-gray-500 font-medium">
                    veya
                  </span>
                </div>
              </div>

              {/* Phone Login Button */}
              <Button
                onClick={() => setStep("phone")}
                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-medium"
                disabled={loading}
              >
                {loading ? "Yükleniyor..." : "Telefon ile Giriş Yap"}
              </Button>
            </div>
          ) : step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
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
                  placeholder="Telefon numarası"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
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
                <p className="text-sm text-gray-600 mb-6">
                  {phone.startsWith("+")
                    ? phone
                    : phone.startsWith("998")
                    ? `+${phone}`
                    : `+998${phone}`}{" "}
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
                {loading ? "Doğrulanıyor..." : "Giriş Yap"}
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

        <div className="mt-6 text-center">
          <p className="text-sm text-white">
            Hesabınız yok mu?{" "}
            <NavLink
              to="/signup"
              className="text-red-600 hover:text-red-700 font-medium"
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
