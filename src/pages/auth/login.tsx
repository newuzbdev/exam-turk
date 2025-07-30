
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { Label } from "@/components/ui/label";
import { Phone, ArrowLeft } from "lucide-react";
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
    setTimer(60); // 1 minute
    setCanResend(false);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      // Ensure phone number has 998 prefix (without +)
      let phoneWithPrefix = phone.trim();
      if (phoneWithPrefix.startsWith("+998")) {
        // Remove + and keep 998 prefix
        phoneWithPrefix = phoneWithPrefix.substring(1);
      } else if (phoneWithPrefix.startsWith("998")) {
        // Already has 998 prefix
        phoneWithPrefix = phoneWithPrefix;
      } else {
        // No prefix at all
        phoneWithPrefix = `998${phoneWithPrefix}`;
      }

      await axiosPrivate.post("/api/otp/send", { phone: phoneWithPrefix });
      toast.success("OTP kodu gönderildi");
      setStep("otp");
      startTimer(); // Start the 1-minute timer
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
      // Ensure phone number has 998 prefix (without +) and ensure code is string
      let phoneWithPrefix = phone.trim();
      if (phoneWithPrefix.startsWith("+998")) {
        // Remove + and keep 998 prefix
        phoneWithPrefix = phoneWithPrefix.substring(1);
      } else if (phoneWithPrefix.startsWith("998")) {
        // Already has 998 prefix
        phoneWithPrefix = phoneWithPrefix;
      } else {
        // No prefix at all
        phoneWithPrefix = `998${phoneWithPrefix}`;
      }

      const response = await axiosPrivate.post("/api/otp/verify", {
        phoneNumber: phoneWithPrefix,
        code: otp.toString()
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
        credential: credentialResponse.credential
      });

      if (response.data.accessToken) {
        localStorage.setItem("accessToken", response.data.accessToken);
        toast.success("Google ile giriş başarılı");
        window.location.href = "/";
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Google ile giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error("Google ile giriş başarısız");
  };

  const getTitle = () => {
    switch (step) {
      case "options": return "Giriş Yap";
      case "phone": return "Telefon ile Giriş";
      case "otp": return "OTP Doğrulama";
      default: return "Giriş Yap";
    }
  };

  const getDescription = () => {
    switch (step) {
      case "options": return "Giriş yapmak için bir yöntem seçin";
      case "phone": return "Telefon numaranızı girin";
      case "otp": return "Size gönderilen 4 haneli kodu girin";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg border p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {getTitle()}
          </h1>
          <p className="text-gray-600">
            {getDescription()}
          </p>
        </div>
        
        <div>
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
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gray-50 px-2 text-gray-500">veya</span>
                </div>
              </div>

              {/* Phone Login Button */}
              <Button
                onClick={() => setStep("phone")}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                <Phone className="mr-2 h-4 w-4" />
                Telefon ile Giriş Yap
              </Button>
            </div>
          ) : step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("options")}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri Dön
              </Button>

              <div>
                <Label htmlFor="phone">Telefon Numarası</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+998901234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Gönderiliyor..." : "OTP Gönder"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("phone")}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri Dön
              </Button>

              <div className="space-y-2">
                <Label className="text-center block">OTP Kodu</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={4}
                    pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                    value={otp}
                    onChange={(value) => setOtp(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-sm text-gray-500 text-center">
                  {phone.startsWith("+") ? phone : phone.startsWith("998") ? `+${phone}` : `+998${phone}`} numarasına gönderilen 4 haneli kodu girin
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading || otp.length !== 4}>
                {loading ? "Doğrulanıyor..." : "Doğrula"}
              </Button>

              <div className="text-center">
                {timer > 0 ? (
                  <p className="text-sm text-gray-500">
                    Tekrar gönder: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSendOtp()}
                    disabled={loading || !canResend}
                  >
                    Tekrar Gönder
                  </Button>
                )}
              </div>
            </form>
          )}
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Hesabınız yok mu?{" "}
              <NavLink to="/signup" className="text-red-600 hover:underline">
                Kayıt Ol
              </NavLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
