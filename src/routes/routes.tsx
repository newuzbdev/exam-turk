import Layout from "@/components/layout";
import Home from "@/pages/home/Home";
import Price from "@/pages/price/price";
import Profile from "@/pages/profile/profile";
import Login from "@/pages/auth/login";
import SignUp from "@/pages/auth/signup";
import OAuthCallback from "@/pages/auth/oauth-callback";
import { createBrowserRouter } from "react-router";
import TestPage from "@/pages/test/test";
import ImprovedSpeakingTest from "@/pages/speaking-test/ImprovedSpeakingTest";
import SpeakingDemo from "@/pages/speaking-demo";
import WritingTest from "@/pages/writing-test/WritingTest";
import WritingTestResults from "@/pages/writing-test/WritingTestResults";
import ListeningTest from "@/pages/listening-test/ListeningTest";
import ListeningTestResults from "@/pages/listening-test/ListeningTestResults";

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
        element: <ImprovedSpeakingTest />,
      },
      {
        path: "/writing-test/:testId",
        element: <WritingTest />,
      },
      {
        path: "/writing-test/results/:resultId",
        element: <WritingTestResults />,
      },
      {
        path: "/listening-test/:testId",
        element: <ListeningTest />,
      },
      {
        path: "/listening-test/results/:resultId",
        element: <ListeningTestResults />,
      },
      {
        path: "/speaking-demo",
        element: <SpeakingDemo />,
      },
    ],
  },
]);
