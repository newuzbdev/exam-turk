import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryProvider } from "./providers/query-provider";
import { RouterProviders } from "./providers/route-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./contexts/AuthContext";
import "./utils/tokenCleanup"; // Import for global functions

createRoot(document.getElementById("root")!).render(
  <QueryProvider>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <RouterProviders />
        <Toaster />
      </AuthProvider>
    </GoogleOAuthProvider>
  </QueryProvider>
);
