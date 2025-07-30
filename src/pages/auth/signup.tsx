
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { Label } from "@/components/ui/label";
import { Phone, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
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
    setTimer(60); // 1 minute
    setCanResend(false);
  };

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      // Ensure phone number has 998 prefix (without +)
      let phoneWithPrefix = formData.phone.trim();
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

      await axiosPrivate.post("/api/otp/send", {
        phone: phoneWithPrefix,
        name: formData.name
      });
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
      let phoneWithPrefix = formData.phone.trim();
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
        code: otp.toString(),
        name: formData.name,
        isSignUp: true
      });

      console.log("OTP Verify Response:", response); // Debug log
      console.log("Response status:", response.status); // Debug log
      console.log("Response data:", response.data); // Debug log

      // Check if OTP verification was successful
      if (response.data.message === "Kod muvaffaqiyatli tasdiqlandi" ||
          response.data.message?.includes("tasdiqlandi") ||
          response.status === 200 ||
          response.status === 201) {
        // OTP verified successfully, move to registration step
        console.log("OTP verification successful, moving to register step");
        setRegistrationData({
          ...registrationData,
          name: formData.name,
          phoneNumber: phoneWithPrefix,
        });
        toast.success("OTP doğrulandı");
        console.log("Setting step to register"); // Debug log
        console.log("Registration data will be:", {
          ...registrationData,
          name: formData.name,
          phoneNumber: phoneWithPrefix,
        });
        setStep("register");
      } else {
        console.log("OTP verification failed or unexpected response");
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
      const response = await axiosPrivate.post("/api/user/register", registrationData);

      if (response.data.accessToken) {
        localStorage.setItem("accessToken", response.data.accessToken);
        toast.success("Kayıt başarılı");
        window.location.href = "/";
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg border p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {step === "form" ? "Kayıt Ol" : step === "otp" ? "OTP Doğrulama" : "Kullanıcı Bilgileri"}
          </h1>
          <p className="text-gray-600">
            {step === "form"
              ? "Hesap oluşturmak için bilgilerinizi girin"
              : step === "otp"
              ? "Size gönderilen 4 haneli kodu girin"
              : "Hesabınızı tamamlamak için bilgilerinizi girin"
            }
          </p>
          {/* Debug info */}
          <p className="text-xs text-gray-400 mt-2">Current step: {step}</p>
          <p className="text-xs text-gray-400">Registration data: {JSON.stringify(registrationData)}</p>
          {/* Debug buttons */}
          <div className="flex gap-2 justify-center mt-2">
            {step === "otp" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log("Manual step change to register");
                  setStep("register");
                }}
                className="text-xs"
              >
                Debug: Go to Register
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => console.log("Current step:", step, "Registration data:", registrationData)}
              className="text-xs"
            >
              Debug: Log State
            </Button>
          </div>
        </div>

        <div>
          {step === "form" ? (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Ad Soyad</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Adınız Soyadınız"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="phone">Telefon Numarası</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+998901234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Gönderiliyor..." : "OTP Gönder"}
              </Button>
            </form>
          ) : step === "otp" ? (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("form")}
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
                  {formData.phone.startsWith("+") ? formData.phone : formData.phone.startsWith("998") ? `+${formData.phone}` : `+998${formData.phone}`} numarasına gönderilen 4 haneli kodu girin
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
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri Dön
              </Button>

              {/* Name field */}
              <div>
                <Label htmlFor="regName">Ad Soyad</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="regName"
                    type="text"
                    placeholder="Adınız Soyadınız"
                    value={registrationData.name}
                    onChange={(e) => setRegistrationData({...registrationData, name: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Username field */}
              <div>
                <Label htmlFor="userName">Kullanıcı Adı</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="userName"
                    type="text"
                    placeholder="kullaniciadi"
                    value={registrationData.userName}
                    onChange={(e) => setRegistrationData({...registrationData, userName: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Phone Number field (readonly) */}
              <div>
                <Label htmlFor="phoneNumber">Telefon Numarası</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="998901234567"
                    value={registrationData.phoneNumber}
                    onChange={(e) => setRegistrationData({...registrationData, phoneNumber: e.target.value})}
                    className="pl-10"
                    required
                    readOnly
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <Label htmlFor="password">Şifre</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Şifrenizi girin"
                    value={registrationData.password}
                    onChange={(e) => setRegistrationData({...registrationData, password: e.target.value})}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Avatar URL field */}
              <div>
                <Label htmlFor="avatarUrl">Avatar URL (İsteğe bağlı)</Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={registrationData.avatarUrl}
                  onChange={(e) => setRegistrationData({...registrationData, avatarUrl: e.target.value})}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Kayıt Oluşturuluyor..." : "Hesap Oluştur"}
              </Button>
            </form>
          )}
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Zaten hesabınız var mı?{" "}
              <NavLink to="/login" className="text-red-600 hover:underline">
                Giriş Yap
              </NavLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
