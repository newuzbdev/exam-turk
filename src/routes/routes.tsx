import Home from "@/pages/home/Home";
import ImprovedSpeakingTest from "@/pages/speaking-test/ImprovedSpeakingTest";
import Layout from "@/components/layout";
import ListeningTest from "@/pages/listening-test/ListeningTest";
import ListeningTestResults from "@/pages/listening-test/ListeningTestResults";
import Login from "@/pages/auth/login";
import OAuthCallback from "@/pages/auth/oauth-callback";
import Price from "@/pages/price/price";
import Profile from "@/pages/profile/profile";
import ReadingTest from "@/pages/reading-test/ReadingTest";
import ReadingTestResults from "@/pages/reading-test/ReadingTestResults";
import SignUp from "@/pages/auth/signup";
import SpeakingDemo from "@/pages/speaking-demo";
import TestPage from "@/pages/test/test";
import WritingTest from "@/pages/writing-test/WritingTest";
import WritingTestResults from "@/pages/writing-test/WritingTestResults";
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
      {
        path: "/reading-test/:testId",
        element: <ReadingTest />,
      },
      {
        path: "/reading-test/results/:resultId",
        element: <ReadingTestResults />,
      },
    ],
  },
]);
