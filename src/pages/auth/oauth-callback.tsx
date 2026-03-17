import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  consumePostLoginRedirect,
  resolvePostLoginRedirect,
  setPostLoginRedirect,
} from "@/utils/postLoginRedirect";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");
        const returnTo = searchParams.get("returnTo") || "/";
        const error = searchParams.get("error");

        if (error) {
          toast.error("Google ile giriş başarısız: " + error);
          const fallback = resolvePostLoginRedirect(returnTo);
          setPostLoginRedirect(fallback);
          navigate("/login", { replace: true, state: { mode: "login", redirectTo: fallback } });
          return;
        }

        if (accessToken) {
          await login(accessToken, refreshToken || undefined);
          toast.success("Google ile giriş başarılı!");
          navigate(consumePostLoginRedirect(returnTo), { replace: true });
        } else {
          toast.error("Giriş başarısız: Token bulunamadı");
          const fallback = resolvePostLoginRedirect(returnTo);
          setPostLoginRedirect(fallback);
          navigate("/login", { replace: true, state: { mode: "login", redirectTo: fallback } });
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        toast.error("Giriş sırasında bir hata oluştu");
        const fallback = resolvePostLoginRedirect(searchParams.get("returnTo") || "/");
        setPostLoginRedirect(fallback);
        navigate("/login", { replace: true, state: { mode: "login", redirectTo: fallback } });
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Giriş yapılıyor...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
