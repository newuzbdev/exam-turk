import { useBillingPurchases } from '@/hooks/use-billing-purchases';
import { eligibleMockPurchases } from '@/services/billing-view';
import { useContentAccessDecisions, useAccessCatalogSummary } from '@/hooks/use-content-access';
import { isContentLocked, initialFreeGroup } from '@/utils/content-access';
import { readDirectMockTarget } from '@/utils/access-direct-entry';
import type { AccessTarget, CatalogMetadata } from '@/services/access.service';
import { useAccessLink } from '@/hooks/use-access-link';
import type { AccessEntry } from '@/utils/access-link-entry';
import { INVALID_ACCESS_LINK_MESSAGE } from '@/utils/access-link-context';
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";
import TestModal from "./components/TestModal";
import EmptyState from "./components/EmptyState";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "@/services/auth.service";
import { tm } from "@/components/tm";
import {
  overallTestFlowStore,
  overallTestService,
} from "@/services/overallTest.service";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { isSubscriptionBillingEnabled } from "@/config/billing";
import { subscriptionService, subscriptionStatusQueryKey } from "@/services/subscription.service";
import MembershipLockBadge from "@/components/subscription/MembershipLockBadge";
import MembershipRequiredDialog from "@/components/subscription/MembershipRequiredDialog";
import "./test.css";
import {
  categorySkill,
  getAvailablePackageTabs,
  getPackageTab,
  packageTabs,
  type MockPackageCategory,
} from "./mock-package-categories";

function MockTestShell({ children }: { children: ReactNode }) {
  return (
    <div className="mock-test-page" lang="tr">
      <header className="mock-test-heading">
        <h1>Deneme Sınavları</h1>
        <p>Tam sınav veya çalışmak istediğiniz bölümü seçin.</p>
      </header>
      {children}
    </div>
  );
}

const sectionPillStyle = (section: string): { background: string; color: string } => {
  const map: Record<string, string> = {
    Dinleme: "listening",
    Okuma: "reading",
    Yazma: "writing",
    Konuşma: "speaking",
  };
  const key = map[section];
  if (!key) {
    return { background: "var(--tm-bg-app)", color: "var(--tm-text-secondary)" };
  }
  return { background: `var(--tm-cat-${key}-bg)`, color: `var(--tm-cat-${key}-fg)` };
};

interface TurkishTest extends CatalogMetadata {
  id: string;
  title: string;
  category?: MockPackageCategory;
  createdAt: string;
  updatedAt: string;
}

interface WritingTest {
  id: string;
  title: string;
  instruction: string;
  type: string;
  ieltsId: string;
  createdAt: string;
  updatedAt: string;
}

interface SpeakingTest {
  id: string;
  title: string;
  ieltsId: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

interface ListeningTest {
  id: string;
  title: string;
  type: string;
  description: string;
  ieltsId: string;
  createdAt: string;
  updatedAt: string;
}

interface ReadingTest {
  id: string;
  title: string;
  type: string;
  description: string;
  ieltsId: string;
  createdAt: string;
  updatedAt: string;
}

interface TurkishTestResponse {
  total: number;
  page: number;
  limit: number;
  ieltsData: TurkishTest[];
  writingTests: WritingTest[];
  speakingTests: SpeakingTest[];
  listeningTests: ListeningTest[];
  readingTests: ReadingTest[];
}

const loadTurkishTestCatalog = async (): Promise<TurkishTestResponse> => {
  const limit = 50;
  let page = 1;
  let catalog: TurkishTestResponse | null = null;

  while (true) {
    const { data } = await axiosPrivate.get<TurkishTestResponse>("/api/ielts", {
      params: { page, limit },
      timeout: 12_000,
    });
    if (!catalog) {
      catalog = { ...data };
    } else {
      catalog.ieltsData.push(...data.ieltsData);
      catalog.writingTests.push(...data.writingTests);
      catalog.speakingTests.push(...data.speakingTests);
      catalog.listeningTests.push(...data.listeningTests);
      catalog.readingTests.push(...data.readingTests);
    }
    if (data.ieltsData.length < limit) return catalog;
    page += 1;
  }
};

const TestPage = ({ workspaceMode = false }: { workspaceMode?: boolean }) => {
  const [turkishTestData, setTurkishTestData] = useState<TurkishTestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const [_selectedTest, setSelectedTest] = useState<TurkishTest | null>(null);
  const [_selectedTestType, setSelectedTestType] = useState<"all" | "listening" | "speaking" | "reading" | "writing">("all");
  const [showTestModal, setShowTestModal] = useState(false);
  const [membershipRequiredOpen, setMembershipRequiredOpen] = useState(false);
  const [currentTestForModal, setCurrentTestForModal] = useState<TurkishTest | null>(null);
  const [initialModalSkills, setInitialModalSkills] = useState<string[]>([]);
  const [selectedPackageTab, setSelectedPackageTab] = useState<MockPackageCategory>("CEFR_MOCK");
  const [, setSessionRevision] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const purchases = useBillingPurchases();
  function ownedMockForPackage(packageId: string, exact?: AccessTarget | null) {
    const targets = (['reading', 'listening', 'writing', 'speaking'] as const).flatMap(skill =>
      (turkishTestData?.[`${skill}Tests`] || []).filter(t => t.ieltsId === packageId).map(t => ({ scope: `MOCK_${skill.toUpperCase()}` as AccessTarget['scope'], targetId: t.id })));
    return targets.some(t => (!exact || t.scope === exact.scope && t.targetId === exact.targetId) && eligibleMockPurchases(purchases.data || [], [t]).length > 0);
  }
  const requestedPackageId = workspaceMode ? searchParams.get('package') : null;
  const directSelection = useMemo(() => {
    try { return { target: workspaceMode ? readDirectMockTarget(searchParams) : null, invalid: false }; }
    catch { return { target: null, invalid: true }; }
  }, [workspaceMode, searchParams]);
  const directAccess = useAccessLink(directSelection.invalid ? null : directSelection.target ?? (requestedPackageId ? { scope: 'MOCK_PACKAGE', targetId: requestedPackageId } : null),
    !!requestedPackageId && ownedMockForPackage(requestedPackageId, directSelection.target));
  const [modalExactTarget, setModalExactTarget] = useState<AccessTarget | null>(null);
  const [modalAccessEntry, setModalAccessEntry] = useState<AccessEntry | null>(null);
  const modalSelectedSkills = useMemo(() => modalExactTarget ? [modalExactTarget.scope.slice(5).toLowerCase()] : initialModalSkills, [modalExactTarget, initialModalSkills]);
  const [directError, setDirectError] = useState('');
  const membership = useQuery({
    queryKey: user?.id ? [...subscriptionStatusQueryKey, user.id] : subscriptionStatusQueryKey,
    queryFn: subscriptionService.getStatus,
    enabled: workspaceMode && isAuthenticated && isSubscriptionBillingEnabled,
    retry: 1,
  });
  const access = useContentAccessDecisions((turkishTestData?.ieltsData || []).map(item => ({ scope: 'MOCK_PACKAGE', targetId: item.id })));
  const summary = useAccessCatalogSummary();
  const explicitTab = useRef(Boolean(searchParams.size || location.state));
  const initialTabChosen = useRef(false);
  useEffect(() => {
    if (initialTabChosen.current || !summary.data) return;
    initialTabChosen.current = true;
    const free = initialFreeGroup(summary.data.groups.filter(group => group.scope === 'MOCK_PACKAGE'), explicitTab.current);
    if (free?.category && packageTabs.some(tab => tab.value === free.category)) setSelectedPackageTab(free.category as MockPackageCategory);
  }, [summary.data]);
  const cardLocked = (test: TurkishTest) => access.pending || purchases.isPending ? true : ownedMockForPackage(test.id) ? false : access.enabled ? isContentLocked(access.decisionFor({ scope: 'MOCK_PACKAGE', targetId: test.id })) : membershipLocked;
  const requiresMembership = workspaceMode && isSubscriptionBillingEnabled;
  const membershipPending = requiresMembership && isAuthenticated && membership.isPending;
  const membershipLocked = requiresMembership && !membership.data?.isActive;
  const sessionExpired =
    workspaceMode && searchParams.get("session") === "expired";

  useEffect(() => {
    if (!sessionExpired) return;

    overallTestFlowStore.clear();
    setSessionRevision((value) => value + 1);
  }, [sessionExpired]);

  useEffect(() => {
    if (!workspaceMode || sessionExpired) return;

    let mounted = true;
    overallTestService.getCurrentSession().then((session) => {
      if (!mounted || session === undefined) return;

      if (session?.canResume) {
        const restoredPath =
          overallTestService.restoreCurrentSession(session);
        if (restoredPath) {
          setSessionRevision((value) => value + 1);
        }
        return;
      }

      if (overallTestFlowStore.hasActive()) {
        overallTestFlowStore.clear();
        setSessionRevision((value) => value + 1);
      }
    });

    return () => {
      mounted = false;
    };
  }, [sessionExpired, workspaceMode]);

  useEffect(() => {
    const fetchTurkishTestData = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const catalog = await loadTurkishTestCatalog();
        setTurkishTestData(catalog);

        if (location.state) {
          const { selectedTestId, selectedTestType: navTestType } = location.state as any;
          if (selectedTestId && navTestType) {
            const test = catalog.ieltsData.find((t: TurkishTest) => t.id === selectedTestId);
            if (test) {
              setSelectedTest(test);
              setSelectedTestType(navTestType);
            }
          }
        }
      } catch (error: any) {
        console.error("Error fetching Turkish test data:", error);
        setTurkishTestData(null);
        setLoadError(true);
        const { accessToken } = authService.getStoredTokens();
        if (accessToken) {
          toast.error("Sınavlar yüklenirken bir sorun oluştu.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTurkishTestData();
  }, [
    location.state,
    requestVersion,
  ]);

  useEffect(() => {
    if (directSelection.invalid) { setDirectError(INVALID_ACCESS_LINK_MESSAGE); return; }
    if (!requestedPackageId || !turkishTestData || directAccess.loading || directAccess.error || (!directAccess.entry?.enabled && membershipPending)) return;
    const requestedPackage = turkishTestData.ieltsData.find((test) => test.id === requestedPackageId);
    if (!requestedPackage) { setDirectError(INVALID_ACCESS_LINK_MESSAGE); return; }
    setSelectedPackageTab(getPackageTab(requestedPackage));
    const actual = directAccess.entry?.target;
    if (directSelection.target && (actual?.scope !== directSelection.target.scope || actual.targetId !== directSelection.target.targetId)) { setDirectError(INVALID_ACCESS_LINK_MESSAGE); return; }
    if (actual?.scope === 'MOCK_PACKAGE' && actual.targetId !== requestedPackageId) { setDirectError(INVALID_ACCESS_LINK_MESSAGE); return; }
    if (actual && actual.scope !== 'MOCK_PACKAGE') {
      const skill = actual.scope.slice(5).toLowerCase();
      const rows = { reading: turkishTestData.readingTests, listening: turkishTestData.listeningTests, writing: turkishTestData.writingTests, speaking: turkishTestData.speakingTests }[skill as 'reading' | 'listening' | 'writing' | 'speaking'];
      if (!rows?.some(row => row.id === actual.targetId && row.ieltsId === requestedPackageId)) { setDirectError(INVALID_ACCESS_LINK_MESSAGE); return; }
    }
    if (!directAccess.entry?.enabled && membershipLocked) {
      setMembershipRequiredOpen(true);
    } else {
      setModalAccessEntry(directAccess.entry);
      setModalExactTarget(actual && actual.scope !== 'MOCK_PACKAGE' ? actual : null);
      setInitialModalSkills(String(searchParams.get("skills") || "").split(",").map((skill) => skill.trim()).filter(Boolean));
      setCurrentTestForModal(requestedPackage);
      setShowTestModal(true);
    }
    navigate("/app/test", { replace: true });
  }, [membershipLocked, membershipPending, navigate, searchParams, turkishTestData, requestedPackageId, directSelection, directAccess.loading, directAccess.error, directAccess.entry]);

  const getAvailableTestTypes = (test: TurkishTest) => {
    if (!turkishTestData) {
      return { writing: [], speaking: [], listening: [], reading: [] };
    }
    const category = getPackageTab(test);
    return {
      writing: turkishTestData.writingTests.filter((t) => t.ieltsId === test.id && (category === "CEFR_MOCK" || category === "WRITING")),
      speaking: turkishTestData.speakingTests.filter((t) => t.ieltsId === test.id && (category === "CEFR_MOCK" || category === "SPEAKING")),
      listening: turkishTestData.listeningTests.filter((t) => t.ieltsId === test.id && (category === "CEFR_MOCK" || category === "LISTENING")),
      reading: turkishTestData.readingTests.filter((t) => t.ieltsId === test.id && (category === "CEFR_MOCK" || category === "READING")),
    };
  };

  const sortedPackages = useMemo(() => {
    const list = turkishTestData?.ieltsData || [];
    if (access.enabled) return list; // Already ordered globally before server pagination.
    return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [turkishTestData?.ieltsData, access.enabled]);

  const availablePackageTabs = useMemo(() => getAvailablePackageTabs(sortedPackages, {
    listening: turkishTestData?.listeningTests ?? [],
    reading: turkishTestData?.readingTests ?? [],
    writing: turkishTestData?.writingTests ?? [],
    speaking: turkishTestData?.speakingTests ?? [],
  }), [sortedPackages, turkishTestData]);

  useEffect(() => {
    if (!explicitTab.current && !availablePackageTabs.has(selectedPackageTab)) {
      const firstAvailable = packageTabs.find((tab) => availablePackageTabs.has(tab.value));
      if (firstAvailable) setSelectedPackageTab(firstAvailable.value);
    }
  }, [selectedPackageTab, availablePackageTabs]);

  const handleTestModalOpen = (test: TurkishTest) => {
    setModalAccessEntry(access.enabled ? { enabled: true, target: { scope: "MOCK_PACKAGE", targetId: test.id }, ownerId: user?.id } : null);
    if (access.pending || purchases.isPending || (!access.enabled && membershipPending)) return;
    const blocked = access.decisionFor({ scope: 'MOCK_PACKAGE', targetId: test.id })?.blockedReason;
    if (cardLocked(test) && blocked !== 'AI_LIMIT' && blocked !== 'EXPIRED') {
      setMembershipRequiredOpen(true);
      return;
    }
    setModalExactTarget(null);
    setInitialModalSkills([]);
    setCurrentTestForModal(test);
    setShowTestModal(true);
  };

  const handleTestTypeClick = (_testType: string, _tests: any[]) => {};

  const activePackages = sortedPackages.filter((test) => getPackageTab(test) === selectedPackageTab);
  const hasAnyPackages = availablePackageTabs.size > 0;
  const activeFlowItem = overallTestFlowStore.getQueue()[0] ?? null;
  const activeFlowResumePath = sessionExpired
    ? null
    : overallTestFlowStore.getPendingNextSection()
      ? "/overall-section-ready"
      : activeFlowItem?.path || null;

  if (loading) {
    return (
      <MockTestShell>
        <div className="mock-test-grid" role="status" aria-label="Sınavlar yükleniyor">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="mock-test-card animate-pulse" aria-hidden="true">
              <div className="h-6 w-24 rounded bg-[var(--tm-bg-muted)]" />
              <div className="mt-5 h-6 w-3/4 rounded bg-[var(--tm-bg-muted)]" />
              <div className="mt-3 h-4 w-1/2 rounded bg-[var(--tm-bg-app)]" />
              <div className="mt-5 flex gap-2">
                <div className="h-7 w-20 rounded bg-[var(--tm-bg-app)]" />
                <div className="h-7 w-20 rounded bg-[var(--tm-bg-app)]" />
              </div>
            </div>
          ))}
        </div>
      </MockTestShell>
    );
  }

  return (
    <MockTestShell>
      <>
          {workspaceMode && !sessionExpired && activeFlowResumePath && (
            <div className="mock-test-resume">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--tm-text-primary)]">
                  Devam eden sınavınız var
                </p>
                <p className="mt-0.5 text-[13px] text-[var(--tm-text-secondary)]">
                  Süre işlemeye devam ediyor. Beş dakika içinde aynı bölüme
                  dönebilirsiniz.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(activeFlowResumePath)}
                className={`${tm.darkButton} shrink-0`}
              >
                Sınava dön
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {loadError ? (
            <div className="mock-test-state" role="alert">
              <p className="text-base font-semibold text-[var(--tm-text-primary)]">
                Sınavlar şu anda yüklenemedi.
              </p>
              <p className="mt-2 text-sm text-[var(--tm-text-secondary)]">
                Bağlantınızı kontrol edip yeniden deneyin.
              </p>
              <button
                type="button"
                onClick={() => setRequestVersion((value) => value + 1)}
                className={`${tm.subtleButton} mt-5 inline-flex h-10 items-center justify-center px-4 text-sm font-semibold`}
              >
                Tekrar dene
              </button>
            </div>
          ) : (
            <>
          <div className="mock-test-tabs" role="group" aria-label="Sınav türü">
            {packageTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => { explicitTab.current = true; setSelectedPackageTab(tab.value); }}
                disabled={!availablePackageTabs.has(tab.value)}
                className="mock-test-tab"
                aria-pressed={selectedPackageTab === tab.value && availablePackageTabs.has(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mock-test-grid">
            {hasAnyPackages ? (
              activePackages.length > 0 ? (
                activePackages.map((test) => {
                  const availableTypes = getAvailableTestTypes(test);
                  const sections = [
                    availableTypes.listening.length > 0 ? "Dinleme" : null,
                    availableTypes.reading.length > 0 ? "Okuma" : null,
                    availableTypes.writing.length > 0 ? "Yazma" : null,
                    availableTypes.speaking.length > 0 ? "Konuşma" : null,
                  ].filter(Boolean);
                  const hasTests =
                    availableTypes.writing.length > 0 ||
                    availableTypes.speaking.length > 0 ||
                    availableTypes.listening.length > 0 ||
                    availableTypes.reading.length > 0;

                  return (
                    <button
                      key={test.id}
                      type="button"
                      onClick={() => hasTests && handleTestModalOpen(test)}
                      disabled={!hasTests}
                      className="mock-test-card"
                      aria-busy={hasTests && (access.pending || (!access.enabled && membershipPending)) || undefined}
                    >
                      <h2 className={hasTests && cardLocked(test) && (access.pending || access.enabled || !membershipPending) ? "pr-8" : undefined}>{test.title}</h2>
                      {hasTests && cardLocked(test) && (access.pending || access.enabled || !membershipPending) && <MembershipLockBadge />}

                      {hasTests && getPackageTab(test) === "CEFR_MOCK" ? (
                        <div className="mock-test-sections">
                          {sections.map((section) => (
                            <span
                              key={section}
                              className="mock-test-section"
                              style={sectionPillStyle(section as string)}
                            >
                              {section}{access.enabled && access.decisionFor({ scope: 'MOCK_PACKAGE', targetId: test.id })?.publicFreeSkills?.includes(({ Dinleme: 'LISTENING', Okuma: 'READING', Yazma: 'WRITING', Konuşma: 'SPEAKING' } as const)[section as 'Dinleme' | 'Okuma' | 'Yazma' | 'Konuşma']) ? ' · Ücretsiz' : ''}
                            </span>
                          ))}
                          <span className="mock-test-cefr-arrow" aria-hidden="true">
                            <ArrowRight size={16} />
                          </span>
                        </div>
                      ) : hasTests ? (
                        <span className="mock-test-standalone-action">
                          Teste başla{access.enabled && access.decisionFor({ scope: 'MOCK_PACKAGE', targetId: test.id })?.isPublicFree ? " · Ücretsiz" : ""}
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                      ) : (
                        <p className="mock-test-unavailable">
                          Hazırlanıyor…
                        </p>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="mock-test-state col-span-full">
                  <p className="text-base font-semibold text-[var(--tm-text-primary)]">
                    {packageTabs.find((tab) => tab.value === selectedPackageTab)?.label} paketi bulunamadı.
                  </p>
                </div>
              )
            ) : (
              <div className="col-span-full">
                <EmptyState selectedTestType="all" isMainTestSelection={true} />
              </div>
            )}
          </div>
            </>
          )}

      <MembershipRequiredDialog open={membershipRequiredOpen} onOpenChange={setMembershipRequiredOpen} />
      {(directAccess.error || directError) && <section role="alert" className="mt-4 rounded-lg border p-5"><p>{directAccess.error || directError}</p>{directAccess.error && !directAccess.invalid && <button type="button" onClick={directAccess.retry}>Tekrar dene</button>}<button type="button" onClick={() => { setDirectError(''); navigate('/app/test', { replace: true }); }}>Kataloğa dön</button></section>}
      {currentTestForModal && (
        <TestModal
          open={showTestModal}
          onOpenChange={setShowTestModal}
          selectedTest={currentTestForModal}
          workspaceMode={workspaceMode}
          initialSelectedSkills={modalSelectedSkills}
          accessEntry={modalAccessEntry ?? undefined}
          singleSkill={modalExactTarget ? modalExactTarget.scope.slice(5).toLowerCase() as 'reading' | 'listening' | 'writing' | 'speaking' : categorySkill[getPackageTab(currentTestForModal)]}
          writingTests={turkishTestData?.writingTests.filter((t) => t.ieltsId === currentTestForModal.id && (!modalExactTarget || (modalExactTarget.scope === 'MOCK_WRITING' && t.id === modalExactTarget.targetId))) || []}
          speakingTests={turkishTestData?.speakingTests.filter((t) => t.ieltsId === currentTestForModal.id && (!modalExactTarget || (modalExactTarget.scope === 'MOCK_SPEAKING' && t.id === modalExactTarget.targetId))) || []}
          listeningTests={turkishTestData?.listeningTests.filter((t) => t.ieltsId === currentTestForModal.id && (!modalExactTarget || (modalExactTarget.scope === 'MOCK_LISTENING' && t.id === modalExactTarget.targetId))) || []}
          readingTests={turkishTestData?.readingTests.filter((t) => t.ieltsId === currentTestForModal.id && (!modalExactTarget || (modalExactTarget.scope === 'MOCK_READING' && t.id === modalExactTarget.targetId))) || []}
          onTestTypeClick={handleTestTypeClick}
        />
      )}
      </>
    </MockTestShell>
  );
};

export default TestPage;
