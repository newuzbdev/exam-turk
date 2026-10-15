import { isPublicLegalPath } from "./config/legal";
import { LegalEntry } from "./pages/legal/LegalEntry";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./mobile.css";
import { QueryProvider } from "./providers/query-provider";
import { RouterProviders } from "./providers/route-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./utils/tokenCleanup"; // Import for global functions
import { installMediaProtection } from "./utils/mediaProtection";
import SignupOriginCapture from "./components/account-updates/signup-origin-capture";
import { captureSignupAttribution } from "./utils/signup-attribution";
import { captureAccessLink } from "./utils/access-link-context";
import { installFocusModality } from "./utils/focusModality";

captureSignupAttribution(window.location.href, document.referrer);
captureAccessLink(window.location);
installMediaProtection();
const disposeFocusModality = installFocusModality();
if (import.meta.hot) import.meta.hot.dispose(disposeFocusModality);

createRoot(document.getElementById("root")!).render(
  isPublicLegalPath(window.location.pathname) ? (
    <ThemeProvider>
      <LegalEntry pathname={window.location.pathname} />
    </ThemeProvider>
  ) : (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <SignupOriginCapture />
          <RouterProviders />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  ),
);
