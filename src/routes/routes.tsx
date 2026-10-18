import LegalPage from "@/pages/legal/LegalPage";
import { RouteErrorPage } from "@/components/errors/RouteErrorPage";
import Layout from "@/components/layout";
import { GuestOnly, LegacyStudentRedirect } from "./student-route-guards";
import { LEGACY_STUDENT_ROOTS } from "./student-route-paths";
import { createBrowserRouter, Navigate } from "react-router";
import RequireStudentAuth from "@/components/auth/require-student-auth";
import { useAuth } from "@/contexts/AuthContext";
import { lazy, type ReactNode } from "react";
import { useStudentLessonsEnabled } from "@/config/studentFeatures";
import { studentPageLoaders } from './student-page-loaders';

const Home = lazy(() => import("@/pages/home/Home"));
const GrammarHome = lazy(() => import("@/pages/lessons/GrammarHome"));
const LessonVideoPage = lazy(() => import("@/pages/lessons/LessonVideoPage"));
const LessonEditorPage = lazy(() => import("@/pages/lessons/workbook/LessonEditorPage"));
const GrammarLevel = lazy(() => import("@/pages/lessons/GrammarLevel"));
const GrammarLesson = lazy(() => import("@/pages/lessons/GrammarLesson"));
const ImprovedSpeakingTest = lazy(
  () => import("@/pages/speaking-test/ImprovedSpeakingTest"),
);
const ListeningTest = lazy(
  () => import("@/pages/listening-test/ListeningTest"),
);
const ListeningTestResults = lazy(
  () => import("@/pages/listening-test/ListeningTestResults"),
);
const Login = lazy(() => import("@/pages/auth/login"));
const OAuthCallback = lazy(() => import("@/pages/auth/oauth-callback"));
const Price = lazy(() => import("@/pages/price/price"));
const SubscriptionPaymentReturn = lazy(() => import("@/pages/profile/SubscriptionPaymentReturn"));
const Profile = lazy(() => import("@/pages/profile/profile"));
const PracticeHome = lazy(studentPageLoaders.practice);
const ReadingTest = lazy(() => import("@/pages/reading-test/ReadingTest"));
const ReadingTestResults = lazy(
  () => import("@/pages/reading-test/ReadingTestResults"),
);
const ReadingPracticeResults = lazy(
  () => import("@/pages/reading-practice/ReadingPracticeResults"),
);
const ReadingPracticeTest = lazy(
  () => import("@/pages/reading-practice/ReadingPracticeTest"),
);
const ListeningPracticeTest = lazy(
  () => import("@/pages/listening-practice/ListeningPracticeTest"),
);
const WritingPracticeTest = lazy(
  () => import("@/pages/writing-practice/WritingPracticeTest"),
);
const SpeakingPracticeTest = lazy(
  () => import("@/pages/speaking-practice/SpeakingPracticeTest"),
);
const TestPage = lazy(studentPageLoaders.mock);
const WritingTest = lazy(() => import("@/pages/writing-test/WritingTest"));
const WritingTestResults = lazy(
  () => import("@/pages/writing-test/WritingTestResults"),
);
const SpeakingTestResults = lazy(
  () => import("@/pages/speaking-test/SpeakingTestResults"),
);
const OverallResults = lazy(
  () => import("@/pages/test/components/OverallResults"),
);
const OverallSectionReadyPage = lazy(
  () => import("@/pages/test/OverallSectionReadyPage"),
);
const StudentWorkspaceLayout = lazy(
  () => import("@/components/student-app/student-workspace-layout"),
);
const StudentDashboard = lazy(studentPageLoaders.dashboard);
const ReportsPage = lazy(studentPageLoaders.reports);
const FocusPage = lazy(() => import("@/pages/focus/focus-page"));
const ExamInformation = lazy(() => import("@/pages/student-app/exam-information"));
const AppReadingPracticeList = lazy(
  () => import("@/pages/reading-practice/AppReadingPracticeList"),
);
const PronunciationCalibrationPage = lazy(
  () =>
    import(
      "@/pages/pronunciation-calibration/PronunciationCalibrationPage"
    ),
);

function AppAwareFallbackRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return <Navigate to={isAuthenticated ? "/app" : "/"} replace />;
}

function LessonsGate({children}:{children:ReactNode}){const lessons=useStudentLessonsEnabled();return lessons.pending?<p role="status">Ders erişimi kontrol ediliyor…</p>:lessons.enabled?children:<Navigate to="/app" replace/>;}

export const router = createBrowserRouter([{ errorElement: <RouteErrorPage />, children: [
  { path: "/privacy-policy", element: <LegalPage document="privacy" /> },
  { path: "/terms-of-service", element: <LegalPage document="terms" /> },
  { path: "/lesson-editor", element: <LessonEditorPage /> },
  { path: "/login", element: <GuestOnly><Login /></GuestOnly> },
  { path: "/signup", element: <Navigate to="/login" replace /> },
  { path: "/oauth-callback", element: <OAuthCallback /> },
  ...LEGACY_STUDENT_ROOTS.map(root => ({ path: `/${root}/*`, element: <LegacyStudentRedirect /> })),
  { path: "/profile", element: <LegacyStudentRedirect /> },
  {
    path: "/", element: <GuestOnly><Layout /></GuestOnly>, children: [
      { index: true, element: <Home /> },
      { path: "price", element: <Price /> },
      { path: "how-it-works", element: <Navigate to="/" replace /> },
    ],
  },
  {
    element: <RequireStudentAuth />, children: [{
      path: "/app", element: <StudentWorkspaceLayout />, children: [
        { index: true, element: <StudentDashboard /> },
        { path: "dersler", element: <LessonsGate><GrammarHome basePath="/app/dersler" studentMode /></LessonsGate> },
        { path: "dersler/video/:previewLessonId", element: <LessonsGate><LessonVideoPage basePath="/app/dersler" /></LessonsGate> },
        { path: "dersler/:level", element: <LessonsGate><GrammarLevel basePath="/app/dersler" studentMode /></LessonsGate> },
        { path: "dersler/:level/:lessonSlug", element: <LessonsGate><GrammarLesson basePath="/app/dersler" embeddedInApp /></LessonsGate> },
        { path: "pratik", element: <PracticeHome basePath="/app/pratik" workspaceMode /> },
        { path: "pratik/dinleme/:id", element: <ListeningPracticeTest /> },
        { path: "pratik/yazma/:id", element: <WritingPracticeTest /> },
        { path: "pratik/konusma/:id", element: <SpeakingPracticeTest /> },
        { path: "pratik/okuma", element: <AppReadingPracticeList /> },
        { path: "pratik/okuma/:id", element: <ReadingPracticeTest /> },
        { path: "pratik/okuma/sonuc/:attemptId", element: <ReadingPracticeResults /> },
        { path: "test", element: <TestPage workspaceMode /> },
        { path: "sonuclar", element: <ReportsPage /> },
        { path: "odak", element: <FocusPage /> },
        { path: "sinav-bilgileri", element: <ExamInformation /> },
        { path: "profil", element: <Profile embedded /> },
        { path: "fiyatlar", element: <Price /> },
        { path: "odeme-sonucu", element: <SubscriptionPaymentReturn /> },
        { path: "nasil-calisir", element: <Navigate to="/app" replace /> },
        { path: "telaffuz-kalibrasyonu", element: <PronunciationCalibrationPage /> },
        { path: "speaking-test/:testId", element: <ImprovedSpeakingTest /> },
        { path: "speaking-test/results/:resultId", element: <SpeakingTestResults /> },
        { path: "writing-test/:testId", element: <WritingTest /> },
        { path: "writing-test/results/:resultId", element: <WritingTestResults /> },
        { path: "listening-test/:testId", element: <ListeningTest /> },
        { path: "listening-test/:testId/part/:partNumber", element: <ListeningTest /> },
        { path: "listening-test/results/:resultId", element: <ListeningTestResults /> },
        { path: "reading-test/:testId", element: <ReadingTest /> },
        { path: "reading-test/results/:resultId", element: <ReadingTestResults /> },
        { path: "speaking-demo", element: <LegacyStudentRedirect /> },
        { path: "overall-section-ready", element: <OverallSectionReadyPage /> },
        { path: "overall-results/:overallId", element: <OverallResults /> },
        { path: "unified-results", element: <LegacyStudentRedirect /> },
        { path: "unified-results/:overallId", element: <LegacyStudentRedirect /> },
        { path: "test-unified-results", element: <LegacyStudentRedirect /> },
        { path: "test-payme", element: <Navigate to="/app/fiyatlar" replace /> },
        { path: "*", element: <Navigate to="/app" replace /> },
      ],
    }],
  },
  { path: "*", element: <AppAwareFallbackRoute /> },
]}]);
