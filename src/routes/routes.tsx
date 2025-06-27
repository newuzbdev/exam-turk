import Layout from "@/components/layout";
import Home from "@/pages/home/Home";
import Price from "@/pages/price/price";
import Profile from "@/pages/profile/profile";
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "/profile",
        element: <Profile />,
      },
      {
        path: "/price",
        element: <Price />,
      },
    ],
  },
]);
