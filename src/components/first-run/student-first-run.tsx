import { startTransition, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOfficialExams } from '@/data/official-exams-api';
import { uzbekistanToday } from '@/data/exam-calendar';
import { useSaveStudentOnboarding, useStudentOnboarding, type StudentOnboardingInput } from '@/pages/dashboard/onboarding-api';
import { FirstRunSetup } from './first-run-setup';
import { hasSkippedFirstRun, isFirstRunEntry, needsFirstRun, skipFirstRun } from './first-run-model';

export default function StudentFirstRun({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user?.id || user.role !== 'USER') return children;
  // Changing accounts unmounts every draft and pending callback.
  return <FirstRunAccount key={user.id} ownerId={user.id}>{children}</FirstRunAccount>;
}

function FirstRunAccount({ ownerId, children }: { ownerId: string; children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const safeEntry = isFirstRunEntry(location.pathname, location.search);
  // A payment/access deep link stays exempt even after its query is scrubbed.
  const [eligibleEntry] = useState(safeEntry);
  const [dismissed, setDismissed] = useState(() => hasSkippedFirstRun(ownerId));
  const profile = useStudentOnboarding(eligibleEntry);
  const save = useSaveStudentOnboarding(profile.data);
  const live = useRef(false);
  const routeKey = useRef(location.key);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useLayoutEffect(() => { routeKey.current = location.key; }, [location.key]);
  const externalCompletion = profile.data !== undefined && !needsFirstRun(profile.data) && !save.isPending && !save.isSuccess;
  const candidate = eligibleEntry && safeEntry && !dismissed && !externalCompletion;
  const blocked = candidate && (profile.data !== undefined || profile.isPending);
  async function submit(input: StudentOnboardingInput) {
    const startedAt = routeKey.current;
    await save.mutateAsync(input);
    if (!live.current) return;
    if (routeKey.current === startedAt) startTransition(() => {
      setDismissed(true);
      navigate('/app', { replace: true });
    });
    else setDismissed(true);
  }
  return <>
    {blocked ? profile.data !== undefined ? <SetupWithCalendar profile={profile.data} onSave={submit}
        onSkip={() => { skipFirstRun(ownerId); setDismissed(true); }} />
        : <div className="first-run__loading" role="status">Bilgileriniz hazırlanıyor…</div>
      : candidate && profile.isError ? <div className="border-b bg-white p-3 text-center text-sm" role="status">Profil bilgileri yüklenemedi. <button className="underline" onClick={() => void profile.refetch()}>Tekrar dene</button></div> : null}
    {/* Keep the router/layout ancestry stable through query cleanup and loading.
        Hidden background pages retain their local modal/draft state. */}
    <div hidden={blocked} style={blocked ? { display: 'none' } : undefined}>{children}</div>
  </>;
}

function SetupWithCalendar(props: Pick<Parameters<typeof FirstRunSetup>[0], 'profile' | 'onSave' | 'onSkip'>) {
  const calendar = useOfficialExams();
  return <FirstRunSetup {...props} sessions={calendar.data?.sessions ?? []} today={uzbekistanToday()}
    calendarPending={calendar.isPending} calendarError={calendar.isError}
    onCalendarRetry={() => void calendar.refetch()} />;
}
