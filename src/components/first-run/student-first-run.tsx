import { startTransition, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePageDataQuery } from '@/hooks/use-page-data-query';
import { useOfficialExams } from '@/data/official-exams-api';
import { uzbekistanToday } from '@/data/exam-calendar';
import { useSaveStudentOnboarding, useStudentOnboarding, type StudentOnboardingInput } from '@/pages/dashboard/onboarding-api';
import listeningPracticeService from '@/services/listeningPractice.service';
import { FirstRunSetup } from './first-run-setup';
import { firstFreeMap, firstPracticePath, hasSkippedFirstRun, isFirstRunEntry, needsFirstRun, skipFirstRun } from './first-run-model';

export default function StudentFirstRun({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user?.id || user.role !== 'USER') return children;
  // Changing accounts unmounts every draft, pending callback and starter card.
  return <FirstRunAccount key={user.id} ownerId={user.id}>{children}</FirstRunAccount>;
}

function FirstRunAccount({ ownerId, children }: { ownerId: string; children: ReactNode }) {
  const location = useLocation();
  const safeEntry = isFirstRunEntry(location.pathname, location.search);
  // A payment/access deep link stays exempt even after its query is scrubbed.
  const [eligibleEntry] = useState(safeEntry);
  const [dismissed, setDismissed] = useState(() => hasSkippedFirstRun(ownerId));
  const profile = useStudentOnboarding(eligibleEntry);
  const save = useSaveStudentOnboarding(profile.data);
  const [ready, setReady] = useState(false);
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
    if (routeKey.current === startedAt) setReady(true);
    else setDismissed(true);
  }
  return <>
    {blocked ? ready ? <FirstPracticeCard onClose={() => setDismissed(true)} />
      : profile.data !== undefined ? <SetupWithCalendar profile={profile.data} onSave={submit}
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

export function FirstPracticeCard({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const leave = (path: string) => startTransition(() => { navigate(path); onClose(); });
  const catalog = usePageDataQuery({
    queryKey: ['practice', 'LISTENING', 'catalog', 'oldest'],
    queryFn: () => listeningPracticeService.list({ order: 'oldest' }),
    retry: 1,
  });
  const starter = !catalog.isError && catalog.data ? firstFreeMap(catalog.data) : undefined;
  return <main className="first-run">
    <header className="first-run__top"><span className="first-run__brand">TURKISHMOCK</span>
      {!starter && <button className="first-run__quiet" onClick={() => leave('/app')}>Dashboard’a git</button>}
    </header>
    <section className="first-run__card" aria-labelledby="first-practice-title">
      <h1 id="first-practice-title" tabIndex={-1} ref={heading}>{starter ? 'İlk pratiğiniz hazır' : 'Birlikte başlayalım'}</h1>
      {catalog.isPending ? <p className="first-run__intro" role="status">Ücretsiz harita pratiği hazırlanıyor…</p> : starter ? <>
        <p className="first-run__starter-details"><span>{starter.title}</span><span className="first-run__free">Ücretsiz</span></p>
      </> : <p className="first-run__intro" role="status">{catalog.isError ? 'Pratikler şu anda yüklenemedi. Yeniden deneyebilir veya katalogdan devam edebilirsiniz.' : 'Şu anda ücretsiz bir harita pratiği bulunmuyor. Diğer çalışmalara pratik kataloğundan bakabilirsiniz.'}</p>}
      <div className={`first-run__footer${starter ? ' first-run__starter-actions' : ''}`}>
        {starter ? <>
          <button className="first-run__quiet" onClick={() => leave('/app')}>Platformu keşfet</button>
          <button className="first-run__primary" onClick={() => leave(firstPracticePath(starter.id))}>Pratiğe başla</button>
        </> : <>
          <button className="first-run__quiet" onClick={() => leave('/app/pratik?bolum=listening')}>Pratiklere göz at</button>
          {catalog.isError ? <button className="first-run__primary" onClick={() => void catalog.refetch()}>Tekrar dene</button> : null}
        </>}
      </div>
    </section>
  </main>;
}
