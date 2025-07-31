import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters - backend sends 'accessToken' not 'token'
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const error = searchParams.get('error');

        if (error) {
          toast.error("Google ile giriş başarısız: " + error);
          navigate("/login", { replace: true });
          return;
        }

        if (accessToken) {
          // Store the tokens
          localStorage.setItem("accessToken", accessToken);
          if (refreshToken) {
            localStorage.setItem("refreshToken", refreshToken);
          }

          toast.success("Google ile giriş başarılı!");

          // Navigate to home page - user data will be fetched by navbar
          navigate("/", { replace: true });
        } else {
          toast.error("Giriş başarısız: Token bulunamadı");
          navigate("/login", { replace: true });
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        toast.error("Giriş sırasında bir hata oluştu");
        navigate("/login", { replace: true });
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
