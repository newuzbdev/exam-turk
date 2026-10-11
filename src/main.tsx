import { isPublicLegalPath } from "./config/legal";
import { LegalEntry } from "./pages/legal/LegalEntry";
import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryProvider } from "./providers/query-provider";
import { RouterProviders } from "./providers/route-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./utils/tokenCleanup"; // Import for global functions
import { installMediaProtection } from "./utils/mediaProtection";
import { captureAccessLink } from './utils/access-link-context';

captureAccessLink(window.location);
installMediaProtection();

createRoot(document.getElementById("root")!).render(
  isPublicLegalPath(window.location.pathname) ? (
    <ThemeProvider><LegalEntry pathname={window.location.pathname} /></ThemeProvider>
  ) : <QueryProvider>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <RouterProviders />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </QueryProvider>
);
