import Layout from "@/components/layout";
import Home from "@/pages/home/Home";
import Price from "@/pages/price/price";
import Profile from "@/pages/profile/profile";
import Login from "@/pages/auth/login";
import SignUp from "@/pages/auth/signup";
import OAuthCallback from "@/pages/auth/oauth-callback";
import { createBrowserRouter } from "react-router";
import TestPage from "@/pages/test/test";
import SpeakingTest from "@/pages/speaking-test/SpeakingTest";

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
    path: "/oauth-callback",
    element: <OAuthCallback />,
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
      {
        path: "/test",
        element: <TestPage />,
      },
      {
        path: "/speaking-test/:testId",
        element: <SpeakingTest />,
      },
    ],
  },
]);
