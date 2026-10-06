import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import {
  normalizeRedirectPath,
  setPostLoginRedirect,
} from "@/utils/postLoginRedirect";

export const useStudentAction = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (target: string) => {
    const redirectTo = normalizeRedirectPath(target) || "/app";

    if (isAuthenticated) {
      navigate(redirectTo);
      return;
    }

    setPostLoginRedirect(redirectTo);
    navigate("/login", {
      state: {
        mode: "login",
        redirectTo,
      },
    });
  };
};
