import { router } from "@/routes/routes";
import { Suspense } from "react";
import { RouterProvider } from "react-router";

export const RouterProviders = () => {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center bg-white"
          role="status"
          aria-label="Sayfa yükleniyor"
        >
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#dededb] border-t-[#37352f]" />
        </div>
      }
    >
      <RouterProvider router={router} />
    </Suspense>
  );
};
