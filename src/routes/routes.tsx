import Layout from "@/components/layout";
import Home from "@/pages/home/Home";
import Price from "@/pages/price/price";
import Profile from "@/pages/profile/profile";
import Login from "@/pages/auth/login";
import SignUp from "@/pages/auth/signup";
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <SignUp />,
  },
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
