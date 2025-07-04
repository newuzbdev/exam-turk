import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const authStatus = searchParams.get("auth");

    if (authStatus === "success") {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      // Show success message (optional)
      console.log("Authentication successful!");

      // Redirect to home or dashboard
      navigate("/", { replace: true });
    } else if (authStatus === "error") {
      // Handle authentication error
      console.error("Authentication failed");
      navigate("/", { replace: true });
    }
  }, [searchParams, navigate, queryClient]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Giriş yapılıyor...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
