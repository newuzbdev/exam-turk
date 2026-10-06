import MockAccessRecovery from '@/components/subscription/MockAccessRecovery';
import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import StudentAppLayout from './student-app-layout';
import { isActiveStudentExam } from '@/routes/student-route-paths';
import { clearExamPresentation } from '@/utils/examFullscreen';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentPresence } from '@/hooks/use-student-presence';

export default function StudentWorkspaceLayout() {
  const { pathname } = useLocation();
  const { user, isAuthenticated } = useAuth();
  useStudentPresence({ userId: isAuthenticated && user?.role === 'USER' ? user.id : undefined, routeContext: { pathname } });
  const activeExam = isActiveStudentExam(pathname);
  useLayoutEffect(() => {
    if (!activeExam) void clearExamPresentation();
  }, [activeExam, pathname]);
  return <>{activeExam ? <Outlet /> : <StudentAppLayout />}<MockAccessRecovery /></>;
}
