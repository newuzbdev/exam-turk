import { router } from "@/routes/routes";
import { RouterProvider } from "react-router";

export const RouterProviders = () => {
  return <RouterProvider router={router} />;
};
