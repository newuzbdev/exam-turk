import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ identifier: "", password: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await authService.loginWithCredentials(
        { name: form.identifier, password: form.password },
        navigate,
      );
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
      <div className="absolute inset-0 bg-black/25"></div>

      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Giriş Yap</h1>
          <p className="text-gray-200 text-lg">
            Kullanıcı adı / telefon / ad ve şifreniz ile giriş yapın
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8 xl:p-10">
          <form onSubmit={handleLogin} className="space-y-4 lg:space-y-6">
            <div>
              <Input
                type="text"
                placeholder="Kullanıcı adı / Telefon / Ad"
                value={form.identifier}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, identifier: e.target.value }))
                }
                className="h-11 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                required
              />
            </div>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Şifreniz"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                className="h-11 border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
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
}

