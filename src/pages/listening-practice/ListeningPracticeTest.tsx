import { useOwnedAccessContext } from '@/hooks/use-access-link';
import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";

import ListeningTestDemo from "@/components/listening-test/ListeningTestDemo";

export default function ListeningPracticeTest() {
  const { id } = useParams<{ id: string }>();
  const ownedAccess = useOwnedAccessContext({ scope: 'PRACTICE_LISTENING', targetId: id });

  useEffect(() => {
    document.body.classList.add("exam-mode");
    return () => document.body.classList.remove("exam-mode");
  }, []);

  if (!id) return <Navigate to="/app/pratik?bolum=listening" replace />;
  return <ListeningTestDemo testId={id} practiceMode accessContextId={ownedAccess.accessContextId} />;
}
