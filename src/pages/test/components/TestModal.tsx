import { readAccessOwner } from '@/hooks/use-access-link';
import { useContentAccessDecisions } from '@/hooks/use-content-access';
import { getContentStartIssue } from '../subscription-preflight';
import MembershipLockBadge from '@/components/subscription/MembershipLockBadge';
import { accessService, type AccessTarget } from '@/services/access.service';
import type { AccessEntry } from '@/utils/access-link-entry';
import { INVALID_ACCESS_LINK_MESSAGE, publishCurrentActivity, saveOwnedAccess } from '@/utils/access-link-context';
import { BookOpen, Check, Headphones, Pencil, X, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { tm } from "@/components/tm";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import overallTestService, { overallTestFlowStore, overallTestTokenStore } from "@/services/overallTest.service";
import { toast } from "sonner";
import testCoinPriceService from "@/services/testCoinPrice.service";
import type { TestCoinPriceItem } from "@/services/testCoinPrice.service";
import TestConfirmationModal from "./TestConfirmationModal";
import PaymeCheckoutModal from "@/components/payme/PaymeCheckoutModal";
import { useStudentAction } from "@/hooks/use-student-action";
import "./TestModal.css";
import { isSubscriptionBillingEnabled } from "@/config/billing";
import { subscriptionService } from "@/services/subscription.service";
import { getSubscriptionStartIssue } from "../subscription-preflight";
import MembershipRequiredDialog from "@/components/subscription/MembershipRequiredDialog";

interface TurkishTest {
  id: string;
  title: string;
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

interface TestModalProps {
  accessEntry?: AccessEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTest: TurkishTest;
  workspaceMode?: boolean;
  initialSelectedSkills?: string[];
  singleSkill?: "listening" | "reading" | "writing" | "speaking";
  writingTests: WritingTest[];
  speakingTests: SpeakingTest[];
  listeningTests: ListeningTest[];
  readingTests: ReadingTest[];
  onTestTypeClick: (testType: string, tests: any[]) => void;
}

const DEBUG_TEST_MODAL = import.meta.env.VITE_DEBUG_API === "true";

const debugTestModal = (event: string, details?: Record<string, unknown>) => {
  if (DEBUG_TEST_MODAL) console.debug("[test-modal]", event, details || {});
};

const TestModal = ({
  open,
  onOpenChange,
  selectedTest,
  accessEntry,
  workspaceMode = false,
  initialSelectedSkills = [],
  singleSkill,
  writingTests,
  speakingTests,
  listeningTests,
  readingTests,
}: TestModalProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, refreshUser } = useAuth();
  const openStudentAction = useStudentAction();

  // selection state - start with empty selection
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [entryMode, setEntryMode] = useState<'AUTO' | 'PAID'>('AUTO');
  const [paidOffer, setPaidOffer] = useState(false);
  const [subscriptionBlockReason, setSubscriptionBlockReason] = useState<string | null>(null);
  const [membershipRequiredOpen, setMembershipRequiredOpen] = useState(false);
  const [staleOverallTestId, setStaleOverallTestId] = useState<string | null>(
    null,
  );
  const [recoverableSessionPath, setRecoverableSessionPath] = useState<
    string | null
  >(null);
  const [recoverableOverallTestId, setRecoverableOverallTestId] = useState<
    string | null
  >(null);
  const [showResumeChoiceModal, setShowResumeChoiceModal] = useState(false);
  const [restartRequested, setRestartRequested] = useState(false);
  const [replacingPreparation, setReplacingPreparation] = useState(false);
  const standaloneEntryStarted = useRef(false);

  useEffect(() => {
    if (!open) standaloneEntryStarted.current = false;
  }, [open]);

  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      const singleSkillAvailable =
        (singleSkill === "listening" && listeningTests.length > 0) ||
        (singleSkill === "reading" && readingTests.length > 0) ||
        (singleSkill === "writing" && writingTests.length > 0) ||
        (singleSkill === "speaking" && speakingTests.length > 0);
      if (singleSkill && singleSkillAvailable) {
        setSelectedSkills([singleSkill]);
      } else if (initialSelectedSkills.length > 0) {
        setSelectedSkills(initialSelectedSkills);
      } else {
        setSelectedSkills([]);
      }
      setShowConfirmationModal(false);
      setIsStarting(false);
      setSubscriptionBlockReason(null);
      setMembershipRequiredOpen(false);
      setEntryMode('AUTO');
      setPaidOffer(false);
      setStaleOverallTestId(null);
      setRecoverableSessionPath(null);
      setRecoverableOverallTestId(null);
      setShowResumeChoiceModal(false);
      setRestartRequested(false);
      setReplacingPreparation(false);
    }
  }, [
    initialSelectedSkills,
    singleSkill,
    open,
    listeningTests.length,
    readingTests.length,
    writingTests.length,
    speakingTests.length,
  ]);

  const toggleSkill = (skillId: string) => {
    if (singleSkill) return;
    setSelectedSkills(prev => 
      prev.includes(skillId) 
        ? prev.filter(id => id !== skillId) 
        : [...prev, skillId]
    );
  };

  // dynamic coin prices
  const [coinPrices, setCoinPrices] = useState<TestCoinPriceItem[] | null>(null);
  useEffect(() => {
    if (isSubscriptionBillingEnabled) {
      setCoinPrices([]);
      return;
    }
    let mounted = true;
    testCoinPriceService.getAll().then((items) => {
      if (mounted) setCoinPrices(items);
    });
    return () => { mounted = false; };
  }, []);

  const coinByType = useMemo(() => {
    const map: Record<string, number> = {};
    (coinPrices || []).forEach((i) => { map[i.testType] = i.coin; });
    return map;
  }, [coinPrices]);

  const skillsData = [
    { 
      id: 'listening', 
      name: "Dinleme",
      testCount: listeningTests.length > 0 ? `${listeningTests.length} test` : '0 test', 
      cost: coinByType["LISTENING"] ?? 2, 
      icon: Headphones 
    },
    { 
      id: 'reading', 
      name: 'Okuma',
      testCount: readingTests.length > 0 ? `${readingTests.length} test` : '0 test', 
      cost: coinByType["READING"] ?? 2, 
      icon: BookOpen 
    },
    { 
      id: 'writing', 
      name: 'Yazma',
      testCount: writingTests.length > 0 ? `${writingTests.length} test` : '0 test', 
      cost: coinByType["WRITING"] ?? 5, 
      icon: Pencil 
    },
    { 
      id: 'speaking', 
      name: "Konuşma",
      testCount: speakingTests.length > 0 ? `${speakingTests.length} test` : '0 test', 
      cost: coinByType["SPEAKING"] ?? 5, 
      icon: MessageCircle 
    },
  ];
  const visibleSkillsData = singleSkill
    ? skillsData.filter((skill) => skill.id === singleSkill)
    : skillsData;

  const totalCost = useMemo(() => {
    return selectedSkills.reduce((total, skillId) => {
      const skill = skillsData.find(s => s.id === skillId);
      return total + (skill ? skill.cost : 0);
    }, 0);
  }, [selectedSkills, skillsData]);
  const hasAvailableSelectedSkill = selectedSkills.some((skillId) => {
    const skill = skillsData.find((item) => item.id === skillId);
    return skill ? skill.testCount !== "0 test" : false;
  });
  const missingCredits = isSubscriptionBillingEnabled
    ? 0
    : Math.max(0, totalCost - (user?.coin ?? 0));
  const isStartDisabled =
    selectedSkills.length === 0 ||
    !hasAvailableSelectedSkill ||
    (workspaceMode && isAuthenticated && missingCredits > 0);
  const selectedSkillItems = visibleSkillsData.filter((skill) =>
    selectedSkills.includes(skill.id),
  );
  const activeFlowItem = overallTestFlowStore.getQueue()[0] ?? null;
  const activeFlowResumePath = overallTestFlowStore.getPendingNextSection()
    ? "/overall-section-ready"
    : activeFlowItem?.path || null;

  const targetForSkill = useCallback((skill: string): AccessTarget | null => {
    const id = ({ reading: readingTests[0]?.id, listening: listeningTests[0]?.id, writing: writingTests[0]?.id, speaking: speakingTests[0]?.id } as Record<string, string | undefined>)[skill];
    return id ? { scope: `MOCK_${skill.toUpperCase()}` as AccessTarget['scope'], targetId: id } : null;
  }, [readingTests, listeningTests, writingTests, speakingTests]);
  const sectionAccess = useContentAccessDecisions(['reading','listening','writing','speaking'].map(targetForSkill).filter((target): target is AccessTarget => Boolean(target)), accessEntry?.redemptionId);

  const checkSubscriptionCapacity = useCallback(async () => {
    if (!accessEntry?.enabled && !isSubscriptionBillingEnabled) return true;
    try {
      if (accessEntry?.enabled) {
        if (!user?.id || accessEntry.ownerId !== user.id) throw new Error('Account changed');
        const targets = selectedSkills.map(targetForSkill).filter((target): target is AccessTarget => Boolean(target));
        if (targets.length !== selectedSkills.length) throw new Error('Selection unavailable');
        const decisions = await accessService.getDecisions(targets, entryMode === 'PAID' ? 'PAID' : undefined, entryMode === 'PAID' ? undefined : accessEntry.redemptionId);
        if (readAccessOwner() !== user.id) throw new Error("Account changed");
        const issue = getContentStartIssue(targets, decisions);
        if (issue) {
          if (issue === 'MEMBERSHIP_REQUIRED') setMembershipRequiredOpen(true);
          else {
            setSubscriptionBlockReason(issue === 'AI_LIMIT' ? 'Bu bölüm için değerlendirme hakkınız kalmadı.' : 'Bu bölüm için erişiminiz sona ermiş.');
            const paid = await accessService.getDecisions(targets, 'PAID');
            setPaidOffer(readAccessOwner() === user.id && !getContentStartIssue(targets, paid) && paid.length === targets.length && paid.every(item => item.sourceKind === 'PAID'));
          }
          return false;
        }
        setSubscriptionBlockReason(null);
        return true;
      }
      const status = await subscriptionService.getStatus();
      const issue = getSubscriptionStartIssue(selectedSkills, status);
      if (issue?.kind === "inactive") {
        setSubscriptionBlockReason(null);
        setMembershipRequiredOpen(true);
        return false;
      }
      const reason = issue?.kind === "insufficient"
          ? `Bu deneme için ${issue.skill === "writing" ? "yazma" : "konuşma"} mock değerlendirme hakkınız kalmadı. Fiyatlar sayfasından tam üyeliği yeniden satın alabilirsiniz.`
          : null;
      if (reason) {
        setSubscriptionBlockReason(reason);
        toast.error(reason);
        return false;
      }
      setSubscriptionBlockReason(null);
      return true;
    } catch {
      const reason = "Üyelik haklarınız kontrol edilemedi. Lütfen yeniden deneyin.";
      setSubscriptionBlockReason(reason);
      toast.error(reason);
      return false;
    }
  }, [selectedSkills, accessEntry, targetForSkill, user?.id, entryMode]);

  const handleCta = useCallback(async () => {
    if (selectedSkills.length === 0) {
      toast.error(singleSkill ? "Bu pakette test henüz hazır değil." : "Lütfen en az bir test bölümü seçin");
      return;
    }
    if (!hasAvailableSelectedSkill) {
      toast.error("Seçilen test bölümü şu anda hazır değil.");
      return;
    }

    if (!workspaceMode) {
      const params = new URLSearchParams({
        package: selectedTest.id,
        skills: selectedSkills.join(","),
      });
      openStudentAction(`/app/test?${params.toString()}`);
      return;
    }

    if (!isAuthenticated) {
      openStudentAction("/app/test");
      return;
    }

    // Preflight coin check: open credit modal if not enough credits
    const userCoins = user?.coin ?? 0;
    if (!accessEntry?.enabled && !isSubscriptionBillingEnabled && userCoins < totalCost) {
      toast.error("Yetersiz kredi. Başlamak için lütfen daha fazla satın alın.");
      setIsCreditModalOpen(true);
      return;
    }

    const currentSession = await overallTestService.getCurrentSession();
    if (!currentSession?.canResume && !(await checkSubscriptionCapacity())) return;
    if (currentSession?.canChangeSelection === true) {
      // Preparation has no started timer or submitted section. The start
      // endpoint rechecks this atomically before replacing it.
      setReplacingPreparation(true);
      setRecoverableSessionPath(null);
      setRecoverableOverallTestId(null);
      setStaleOverallTestId(null);
      setRestartRequested(false);
      setShowResumeChoiceModal(false);
      setShowConfirmationModal(true);
      return;
    }
    setReplacingPreparation(false);
    let resumePath = activeFlowResumePath;
    if (currentSession !== undefined) {
      if (currentSession?.canResume) {
        resumePath =
          overallTestService.restoreCurrentSession(currentSession);
      } else {
        overallTestFlowStore.clear();
        resumePath = null;
      }
    }
    const currentOverallTestId =
      currentSession === undefined
        ? user?.currentOverallTestId ?? null
        : currentSession?.id ?? null;

    if (resumePath) {
      setRecoverableSessionPath(resumePath);
      setRecoverableOverallTestId(
        currentOverallTestId ? String(currentOverallTestId) : null,
      );
      setStaleOverallTestId(null);
      setRestartRequested(false);
      setShowResumeChoiceModal(true);
      return;
    }

    setRecoverableSessionPath(resumePath);
    setStaleOverallTestId(
      !resumePath && currentOverallTestId
        ? String(currentOverallTestId)
        : null,
    );

    // Show confirmation modal instead of immediately starting
    setShowConfirmationModal(true);
  }, [
    selectedSkills,
    singleSkill,
    hasAvailableSelectedSkill,
    workspaceMode,
    selectedTest.id,
    openStudentAction,
    isAuthenticated,
    user?.coin,
    accessEntry?.enabled,
    user?.currentOverallTestId,
    totalCost,
    activeFlowResumePath,
    checkSubscriptionCapacity,
  ]);

  // Standalone packages already have a fixed section. Run the same checks as
  // the section picker, then open the existing warning without an extra click.
  useEffect(() => {
    if (
      !open || !singleSkill || standaloneEntryStarted.current ||
      selectedSkills.length !== 1 || selectedSkills[0] !== singleSkill
    ) return;

    standaloneEntryStarted.current = true;
    void handleCta();
  }, [open, singleSkill, selectedSkills, handleCta]);

  const handleContinueSession = () => {
    if (!recoverableSessionPath) return;

    setShowResumeChoiceModal(false);
    setRecoverableOverallTestId(null);
    onOpenChange(false);
    navigate(recoverableSessionPath);
  };

  const handleRestartSession = () => {
    const currentOverallTestId =
      recoverableOverallTestId ??
      (user?.currentOverallTestId
        ? String(user.currentOverallTestId)
        : null);

    if (!currentOverallTestId) {
      toast.error("Devam eden sınav oturumu bulunamadı. Lütfen yeniden deneyin.");
      return;
    }

    setStaleOverallTestId(currentOverallTestId);
    setRecoverableSessionPath(null);
    setShowResumeChoiceModal(false);
    setRestartRequested(true);
    setShowConfirmationModal(true);
  };

  const handleConfirmStart = async () => {
    if (!restartRequested && !replacingPreparation && recoverableSessionPath) {
      setShowConfirmationModal(false);
      onOpenChange(false);
      navigate(recoverableSessionPath);
      return;
    }
    if (!restartRequested && !replacingPreparation && activeFlowResumePath === "/overall-section-ready") {
      setShowConfirmationModal(false);
      onOpenChange(false);
      navigate(activeFlowResumePath);
      return;
    }
    if (!restartRequested && !replacingPreparation && activeFlowItem?.path) {
      setShowConfirmationModal(false);
      onOpenChange(false);
      navigate(activeFlowItem.path);
      return;
    }

    if (isStarting) return;
    if (!(await checkSubscriptionCapacity())) {
      setShowConfirmationModal(false);
      return;
    }
    setIsStarting(true);
    let accessContextId: string | undefined;
    if (accessEntry?.enabled) {
      if (!user?.id || accessEntry.ownerId !== user.id) {
        setIsStarting(false);
        setSubscriptionBlockReason('Hesabınız değişti. Bağlantıyı yeniden açın.');
        return;
      }
      const selectedTargets = ([
        selectedSkills.includes('reading') && readingTests[0]?.id ? { scope: 'MOCK_READING', targetId: readingTests[0].id } : null,
        selectedSkills.includes('listening') && listeningTests[0]?.id ? { scope: 'MOCK_LISTENING', targetId: listeningTests[0].id } : null,
        selectedSkills.includes('writing') && writingTests[0]?.id ? { scope: 'MOCK_WRITING', targetId: writingTests[0].id } : null,
        selectedSkills.includes('speaking') && speakingTests[0]?.id ? { scope: 'MOCK_SPEAKING', targetId: speakingTests[0].id } : null,
      ] as Array<AccessTarget | null>).filter((target): target is AccessTarget => target !== null);
      try {
        const owned = await accessService.createSession(accessEntry.target, {
          ...(entryMode === 'PAID' ? { mode: 'PAID' as const } : accessEntry.redemptionId ? { shareRedemptionId: accessEntry.redemptionId } : {}),
          ...(accessEntry.target.scope === 'MOCK_PACKAGE' ? { selectedTargets } : {}),
        });
        if (readAccessOwner() !== user.id) throw new Error("Account changed");
        accessContextId = owned.contextId;
        if (user?.id) saveOwnedAccess(user.id, accessEntry.target, { ...accessEntry, contextId: accessContextId });
      } catch (reason) {
        setIsStarting(false);
        const status = (reason as { response?: { status?: number } })?.response?.status;
        setSubscriptionBlockReason(accessEntry.redemptionId && [400, 403, 404].includes(status || 0) ? INVALID_ACCESS_LINK_MESSAGE : status === 402 ? 'Bu bölüm için değerlendirme hakkınız kalmadı.' : 'Bu bölüm için erişiminiz şu anda doğrulanamadı. Lütfen yeniden deneyin.');
        return;
      }
    }

    if (staleOverallTestId) {
      const abandoned =
        await overallTestService.abandonStaleSession(staleOverallTestId);
      if (!abandoned) {
        setIsStarting(false);
        return;
      }
      await refreshUser().catch(() => undefined);
      if (restartRequested) {
        toast.info("Önceki yarım kalan sınav oturumu kapatıldı.");
      }
    }
    setRecoverableSessionPath(null);
    setRecoverableOverallTestId(null);
    setRestartRequested(false);

    // Always start from a clean runtime state so previous unfinished tests cannot be resumed.
    try {
      overallTestFlowStore.clear();
      const runtimePrefixes = [
        "reading_progress_",
        "listening_progress_",
        "listening_audio_progress_",
        "writing_progress_",
        "writing_v2_progress_",
        "speaking_progress_",
        "reading_answers_",
        "listening_answers_",
        "writing_answers_",
        "speaking_answers_",
        "test_data_",
        "overall.sessionToken.",
        "overall.flow.",
      ];
      Object.keys(sessionStorage).forEach((key) => {
        if (runtimePrefixes.some((prefix) => key.startsWith(prefix))) {
          sessionStorage.removeItem(key);
        }
      });
    } catch {}

    // Determine selected tests and call overall start API first
    const readingId = selectedSkills.includes('reading') && readingTests?.[0]?.id ? readingTests[0].id : undefined;
    const listeningId = selectedSkills.includes('listening') && listeningTests?.[0]?.id ? listeningTests[0].id : undefined;
    const writingId = selectedSkills.includes('writing') && writingTests?.[0]?.id ? writingTests[0].id : undefined;
    const speakingId = selectedSkills.includes('speaking') && speakingTests?.[0]?.id ? speakingTests[0].id : undefined;

    // Yeni bir genel test oturumu başlatırken, daha önceki denemelerden kalan
    // yerel cevapları temizleyelim ki kullanıcı tertemiz bir testle başlasın.
    try {
      if (readingId) {
        sessionStorage.removeItem(`reading_answers_${readingId}`);
      }
      if (listeningId) {
        sessionStorage.removeItem(`listening_answers_${listeningId}`);
      }
      if (writingId) {
        sessionStorage.removeItem(`writing_answers_${writingId}`);
      }
      if (speakingId) {
        sessionStorage.removeItem(`speaking_answers_${speakingId}`);
      }
    } catch {
      // storage erişim hatalarını sessizce yoksay
    }

    // Show loading state
    // toast.info("Starting test session...");

    const startRes = await overallTestService.start({ readingId, listeningId, writingId, speakingId, ...(accessContextId ? { accessContextId } : {}) });
    if (!startRes) {
      setIsStarting(false);
      return;
    }
    setShowConfirmationModal(false);
    try {
      const oid = (startRes as any)?.overallTestId || (startRes as any)?.overallId || (startRes as any)?.overallTestResultId || (startRes as any)?.id;
      if (oid) {
        overallTestFlowStore.setOverallId(String(oid));
        if (accessEntry && accessContextId && user?.id) saveOwnedAccess(user.id, { ...accessEntry.target, targetId: `overall:${oid}` }, { ...accessEntry, contextId: accessContextId });
        if (accessEntry && accessContextId && user?.id) publishCurrentActivity(user.id, 'MOCK', { contentId: String(oid), attemptId: String(oid), target: accessEntry.target });
      }
    } catch {}

    // Build ordered queue based on selection order in UI (listening -> reading -> writing -> speaking)
    const queue = [
      selectedSkills.includes('listening') && listeningTests?.[0]?.id
        ? { testType: "LISTENING" as const, testId: listeningTests[0].id, path: `/listening-test/${listeningTests[0].id}` }
        : null,
      selectedSkills.includes('reading') && readingTests?.[0]?.id
        ? { testType: "READING" as const, testId: readingTests[0].id, path: `/reading-test/${readingTests[0].id}` }
        : null,
      selectedSkills.includes('writing') && writingTests?.[0]?.id
        ? { testType: "WRITING" as const, testId: writingTests[0].id, path: `/writing-test/${writingTests[0].id}` }
        : null,
      selectedSkills.includes('speaking') && speakingTests?.[0]?.id
        ? { testType: "SPEAKING" as const, testId: speakingTests[0].id, path: `/speaking-test/${speakingTests[0].id}` }
        : null,
    ].filter(Boolean) as { testType: any; testId: string; path: string }[];

    // Fetch ALL test data upfront to avoid GET requests during navigation
    // toast.info("Loading test data...");
    try {
      const { listeningTestService } = await import("@/services/listeningTest.service");
      const { readingTestService } = await import("@/services/readingTest.service");
      const { writingTestService } = await import("@/services/writingTest.service");
      const { default: axiosPrivate } = await import("@/config/api");

      const testDataPromises = [];

      // Fetch listening test data
      if (listeningId) {
        testDataPromises.push(
          listeningTestService.getTestWithFullData(listeningId).then(data => ({
            type: 'LISTENING',
            testId: listeningId,
            data
          }))
        );
      }

      // Fetch reading test data
      if (readingId) {
        testDataPromises.push(
          readingTestService.getTestWithFullData(readingId).then(data => ({
            type: 'READING',
            testId: readingId,
            data
          }))
        );
      }

      // Fetch writing test data
      if (writingId) {
        testDataPromises.push(
          writingTestService.getPublishedV2(writingId).then(data => ({
            type: 'WRITING',
            testId: writingId,
            data
          }))
        );
      }

      // Fetch speaking test data
      if (speakingId) {
        testDataPromises.push(
          Promise.resolve().then(async () => {
            const sessionToken = overallTestTokenStore.getByTestId(speakingId);
            if (!sessionToken) {
              throw new Error("Speaking session token missing");
            }
            const res = await axiosPrivate.get(`/api/speaking-test/${speakingId}/solve`, {
              params: { sessionToken },
            });
            return {
              type: 'SPEAKING',
              testId: speakingId,
              data: res.data
            };
          })
        );
      }

      // Wait for all test data to load
      const allTestData = await Promise.all(testDataPromises);
      
      // Store all test data in sessionStorage
      allTestData.forEach(({ type, testId, data }: { type: string; testId: string; data: any }) => {
        sessionStorage.setItem(`test_data_${type}_${testId}`, JSON.stringify(data));
      });

      // toast.success("Test data loaded successfully!");
    } catch (error: any) {
      debugTestModal("load-test-data-error", {
        status: error?.response?.status,
        code: error?.code,
      });
      toast.error("Bazı test verileri yüklenemedi, ancak devam ediliyor...");
    }

    // Store the queue in session for chaining
    // Set queue and ensure initial count is correct
    overallTestFlowStore.setQueue(queue);

    // Always show section-ready screen before first selected section
    const first = queue[0];
    if (first?.path) {
      overallTestFlowStore.setPendingNextSection({
        fromTestType: first.testType,
        next: first,
        totalCount: queue.length,
        completedCount: 0,
      });
      navigate("/overall-section-ready");
      setIsStarting(false);
      return;
    }

    setIsStarting(false);
    navigate("/app/test");
  };

  const handleCancelConfirmation = () => {
    setShowConfirmationModal(false);
    setReplacingPreparation(false);
    setRestartRequested(false);
    setStaleOverallTestId(null);
    setRecoverableOverallTestId(null);
    if (singleSkill) onOpenChange(false);
    // Don't deduct coins - just close the modal
  };

  const handleCreditPurchaseSuccess = async () => {
    await refreshUser();
    setIsCreditModalOpen(false);
    toast.success("Kredi hesabınıza eklendi. Şimdi teste başlayabilirsiniz.");
  };

  if (!open) return null;
  if (membershipRequiredOpen) {
    return (
      <MembershipRequiredDialog
        open
        onOpenChange={(nextOpen) => {
          setMembershipRequiredOpen(nextOpen);
          if (!nextOpen) onOpenChange(false);
        }}
      />
    );
  }

  return (
    <>
      {!showConfirmationModal && !singleSkill && (
      <div 
        className="test-section-overlay"
        onClick={() => onOpenChange(false)}
      >
        <div
          className="test-section-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="test-section-title"
          aria-describedby="test-section-exam"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="test-section-header">
            <div className="min-w-0">
              <h2 id="test-section-title">Bölüm seçin</h2>
              <p id="test-section-exam">{selectedTest.title}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="test-section-close"
              aria-label="Pencereyi kapat"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="test-section-body">
            <div className="test-section-grid" role="group" aria-label="Sınav bölümleri">
              {visibleSkillsData.map((skill) => {
                const isSelected = selectedSkills.includes(skill.id);
                const target = targetForSkill(skill.id);
                const decision = target ? sectionAccess.decisionFor(target) : undefined;
                const contentLocked = accessEntry?.enabled && !decision?.canOpen;
                const isAvailable = skill.testCount !== "0 test";
                const isLocked = Boolean(singleSkill && skill.id === singleSkill && isAvailable);
                const Icon = skill.icon;

                return (
                  <button
                    type="button"
                    key={skill.id}
                    disabled={!isAvailable || isLocked}
                    onClick={() => { if (contentLocked && decision?.blockedReason !== 'AI_LIMIT' && decision?.blockedReason !== 'EXPIRED') { setMembershipRequiredOpen(true); return; } if (isAvailable && !isLocked) toggleSkill(skill.id); }}
                    aria-pressed={isSelected}
                    className="test-section-card"
                    data-skill={skill.id}
                    data-locked={isLocked || undefined}
                  >
                    <span className="test-section-card-top">
                      <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
                      <span className="test-section-check" aria-hidden="true">
                        {isSelected && <Check size={13} strokeWidth={2.5} />}
                      </span>
                    </span>
                    <span className="test-section-name">{skill.name}{decision?.isPublicFree ? " · Ücretsiz" : ""}</span>
                    {contentLocked && <MembershipLockBadge />}
                  </button>
                );
              })}
            </div>

            {!isSubscriptionBillingEnabled && workspaceMode && isAuthenticated && missingCredits > 0 && (
              <p
                className="mt-2.5 rounded-[7px] px-3 py-1.5 text-[11px] font-medium leading-5"
                style={{
                  background: "var(--tm-cat-speaking-bg)",
                  color: "var(--tm-cat-speaking-fg)",
                }}
              >
                Başlamak için {missingCredits} kredi daha gerekli.
              </p>
            )}
            {(isSubscriptionBillingEnabled || accessEntry?.enabled) && subscriptionBlockReason && (
              <div className="mt-2.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-950" role="alert">
                {subscriptionBlockReason}
                {paidOffer && <button type="button" className="ml-2 font-semibold underline" onClick={() => { standaloneEntryStarted.current = false; setEntryMode("PAID"); setPaidOffer(false); setSubscriptionBlockReason(null); }}>Üyeliğimle devam et</button>}
                <button type="button" className="ml-2 font-semibold underline" onClick={() => navigate("/app/fiyatlar#fiyatlandirma")}>Fiyatlar</button>
              </div>
            )}
          </div>

          <div className="test-section-footer">
              <p aria-live="polite" aria-atomic="true">{selectedSkillItems.length} bölüm seçili</p>
              <div className="test-section-actions">
                {!isSubscriptionBillingEnabled && workspaceMode && isAuthenticated && missingCredits > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreditModalOpen(true)}
                    className={`${tm.subtleButton} h-9 flex-1 px-3 text-[13px] font-semibold sm:flex-none`}
                  >
                    Kredi Al
                  </button>
                )}
                <button
                  onClick={handleCta}
                  disabled={isStartDisabled}
                  className="test-section-start"
                >
                  {workspaceMode
                    ? isAuthenticated
                      ? "Teste başla"
                      : "Oturum Aç"
                    : isAuthenticated
                      ? "Çalışma Alanında Aç"
                      : "Oturum Aç"}
                </button>
              </div>
          </div>
        </div>
      </div>

      )}
      {singleSkill && subscriptionBlockReason && !showConfirmationModal && !showResumeChoiceModal && (
        <div className="test-section-overlay">
          <div className="test-section-dialog" role="alertdialog" aria-modal="true" aria-label="Üyelik hakkı gerekli" style={{ padding: 24 }}>
            <p className="text-sm leading-6">{subscriptionBlockReason}</p>
            {paidOffer && <button type="button" className="mt-3 font-semibold underline" onClick={() => { standaloneEntryStarted.current = false; setEntryMode("PAID"); setPaidOffer(false); setSubscriptionBlockReason(null); }}>Üyeliğimle devam et</button>}
            <div className="mt-5 flex gap-3">
              <button type="button" className={`${tm.subtleButton} h-10 flex-1 px-4`} onClick={() => onOpenChange(false)}>Kapat</button>
              <button type="button" className={`${tm.primaryButton} h-10 flex-1 px-4`} onClick={() => navigate("/app/fiyatlar#fiyatlandirma")}>Fiyatlar</button>
            </div>
          </div>
        </div>
      )}
      {singleSkill && !subscriptionBlockReason && !showConfirmationModal && !showResumeChoiceModal && !isCreditModalOpen && (
        <div className="test-section-overlay" role="status" aria-live="polite">
          <div className="test-section-dialog" style={{ padding: 24 }}>
            Sınav hazırlığı kontrol ediliyor…
          </div>
        </div>
      )}
      {showResumeChoiceModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 font-sans animate-in fade-in">
          <div className="w-full max-w-[520px] overflow-hidden rounded-lg border border-[var(--tm-border-subtle)] bg-white shadow-xl animate-in slide-in-from-bottom-5">
            <div className="border-b border-[var(--tm-border-subtle)] px-6 py-5">
              <h2 className="text-xl font-semibold text-[var(--tm-text-primary)]">
                Devam eden sınavınız var
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--tm-text-secondary)]">
                Kaldığınız yerden devam edebilir veya yeni bir sınav
                başlatabilirsiniz.
              </p>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm leading-6 text-amber-950">
                  Yeniden başlarsanız mevcut deneme kapanır ve yeni bir deneme açılır.
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-[var(--tm-border-subtle)] px-6 py-4">
              <button
                type="button"
                onClick={handleRestartSession}
                className={`${tm.subtleButton} h-11 flex-1 px-5 text-sm font-semibold`}
              >
                Yeniden başla
              </button>
              <button
                type="button"
                onClick={handleContinueSession}
                className={`${tm.primaryButton} h-11 flex-1 px-5 text-sm font-semibold`}
              >
                Sınava devam et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <TestConfirmationModal
        open={showConfirmationModal}
        onOpenChange={setShowConfirmationModal}
        onConfirm={handleConfirmStart}
        onCancel={handleCancelConfirmation}
        replacesActiveSession={Boolean(staleOverallTestId) && restartRequested}
        restartActiveSession={restartRequested}
        isStarting={isStarting}
      />


      {!isSubscriptionBillingEnabled && <PaymeCheckoutModal
        isOpen={isCreditModalOpen}
        onClose={() => {
          setIsCreditModalOpen(false);
          if (singleSkill) onOpenChange(false);
        }}
        planName="Kredi Satın Al"
        planId="quick"
        initialUnits={missingCredits > 0 ? missingCredits : undefined}
        onSuccess={handleCreditPurchaseSuccess}
      />}
    </>
  );
};

export default TestModal;
