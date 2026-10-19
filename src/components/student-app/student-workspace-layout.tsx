import StudentAccountUpdates from "@/components/account-updates/student-account-updates";
import MockAccessRecovery from "@/components/subscription/MockAccessRecovery";
import { useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router";
import StudentAppLayout from "./student-app-layout";
import { isActiveStudentExam } from "@/routes/student-route-paths";
import { clearExamPresentation } from "@/utils/examFullscreen";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentPresence } from "@/hooks/use-student-presence";
import StudentFirstRun from "@/components/first-run/student-first-run";

export default function StudentWorkspaceLayout() {
  const { pathname } = useLocation();
  const { user, isAuthenticated } = useAuth();
  useStudentPresence({
    userId: isAuthenticated && user?.role === "USER" ? user.id : undefined,
    routeContext: { pathname },
  });
  const activeExam = isActiveStudentExam(pathname);
  useLayoutEffect(() => {
    if (!activeExam) void clearExamPresentation();
  }, [activeExam, pathname]);
  return (
    <>
      <StudentFirstRun>{activeExam ? <Outlet /> : <StudentAppLayout />}</StudentFirstRun>
      <MockAccessRecovery />
      <StudentAccountUpdates
        userId={isAuthenticated && user?.role === "USER" ? user.id : undefined}
        enabled={
          !activeExam &&
          import.meta.env.VITE_ADMIN_LAUNCH_FEATURES_ENABLED === "true"
        }
      />
    </>
  );
}
