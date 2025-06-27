import { createRoot } from "react-dom/client";

import "./index.css";
import { QueryProvider } from "./providers/query-provider";
import { RouterProviders } from "./providers/route-provider";

createRoot(document.getElementById("root")!).render(
  <QueryProvider>
    <RouterProviders />
  </QueryProvider>
);
