import { publishCurrentActivity } from '@/utils/access-link-context';
import { useContentAccessDecisions } from '@/hooks/use-content-access';
import { isContentLocked } from '@/utils/content-access';
import { bindNormalAccess } from '@/utils/normal-access-entry';
import { readAccessOwner } from '@/hooks/use-access-link';
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ChevronRight, Coins, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import PaymeCheckoutModal from "@/components/payme/PaymeCheckoutModal";
import { isSubscriptionBillingEnabled } from "@/config/billing";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { readingPracticeService, type ReadingPracticeListItem } from "@/services/readingPractice.service";
import { PageIntro, Surface, tm } from "@/components/tm";
import { useStudentAction } from "@/hooks/use-student-action";
import MembershipLockBadge from "@/components/subscription/MembershipLockBadge";
import MembershipRequiredDialog from "@/components/subscription/MembershipRequiredDialog";
import PracticeCoverImage from "@/components/practice/PracticeCoverImage";
import { usePageDataQuery } from '@/hooks/use-page-data-query';

const EMPTY_ITEMS: ReadingPracticeListItem[] = [];
const EMPTY_COMPLETED_IDS: string[] = [];

const DEFAULT_COVER =
  "linear-gradient(135deg, rgba(17,24,39,0.86) 0%, rgba(55,65,81,0.58) 55%, rgba(185,28,28,0.24) 100%)";

type SortMode = "yeni" | "eski" | "calisilmayanlar";
type LevelFilter = "tum" | "A1" | "A2" | "B1" | "B2" | "C1" | "MULTILEVEL";
type SectionFilter = "tum" | 1 | 2 | 3 | 4 | 5;

type ListFilters = {
  levelFilter: LevelFilter;
  sectionFilter: SectionFilter;
  sortMode: SortMode;
};

const filterStorageKey = (workspaceMode: boolean) =>
  `reading-practice-filters:${workspaceMode ? "workspace" : "public"}`;

function readSavedFilters(workspaceMode: boolean): ListFilters {
  const defaults: ListFilters = {
    levelFilter: "tum",
    sectionFilter: "tum",
    sortMode: "yeni",
  };
  if (typeof window === "undefined") return defaults;
  try {
    const saved = JSON.parse(
      window.sessionStorage.getItem(filterStorageKey(workspaceMode)) || "null",
    );
    if (!saved || typeof saved !== "object") return defaults;
    return {
      levelFilter: ["tum", "A1", "A2", "B1", "B2", "C1", "MULTILEVEL"].includes(saved.levelFilter)
        ? saved.levelFilter : defaults.levelFilter,
      sectionFilter: ["tum", 1, 2, 3, 4, 5].includes(saved.sectionFilter)
        ? saved.sectionFilter : defaults.sectionFilter,
      sortMode: (workspaceMode ? ["yeni", "eski", "calisilmayanlar"] : ["yeni", "eski"]).includes(saved.sortMode)
        ? saved.sortMode : defaults.sortMode,
    };
  } catch {
    return defaults;
  }
}

type SavedProgress = {
  passageId: string;
  attemptId?: string;
  ownerId?: string;
  answeredCount: number;
  answers: Record<string, string>;
  timerEnabled: boolean;
  timerMinutes: number;
  updatedAt: number;
};

type ReadingPracticeListCard = ReadingPracticeListItem & {
  savedProgress: SavedProgress | null;
  answeredCount: number;
  hasProgress: boolean;
  isWorked: boolean;
  isCompleted: boolean;
  coinCost: number;
};

type ReadingPracticeListProps = {
  embedded?: boolean;
  inlineToolbar?: boolean;
  workspaceMode?: boolean;
  hasActiveMembership?: boolean;
  membershipPending?: boolean;
  active?: boolean;
  initialStartId?: string | null;
  onStartIntentHandled?: () => void;
  onBack?: () => void;
};

const progressStorageKey = (id: string) => `reading-practice-progress:${id}`;
const PRACTICE_BASE_PATH = "/app/pratik/okuma";

function readSavedProgress(id: string): SavedProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(progressStorageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProgress;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearSavedProgress(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(progressStorageKey(id));
}

function getCoinCost(item: ReadingPracticeListItem) {
  if (item.isFreeAccess) return 0;
  if (item.isFreeAccessManaged) return 0;
  if (isSubscriptionBillingEnabled) return 0;
  const raw = item.coinCost ?? item.price ?? 0;
  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 0;
}

function normalizeCoverImage(url?: string) {
  if (!url) return "";
  return url;
}

export default function ReadingPracticeList({
  embedded = false,
  inlineToolbar = false,
  workspaceMode = false,
  hasActiveMembership = false,
  membershipPending = false,
  active = true,
  initialStartId,
  onStartIntentHandled,
  onBack,
}: ReadingPracticeListProps) {
  const navigate = useNavigate();
  const { isAuthenticated, user, refreshUser } = useAuth();
  const openStudentAction = useStudentAction();
  const handledStartIntentRef = useRef<string | null>(null);
  const [{ levelFilter, sectionFilter, sortMode }, setFilters] = useState(
    () => readSavedFilters(workspaceMode),
  );
  const targetFor = (id: string) => ({ scope: 'PRACTICE_READING' as const, targetId: id });
  const order = sortMode === 'eski' ? 'oldest' : 'newest';
  const catalog = usePageDataQuery({
    queryKey: ['practice', 'reading', 'catalog', order, initialStartId ?? null],
    enabled: active,
    queryFn: async () => {
      const rows = await readingPracticeService.getAll({ order });
      if (initialStartId && !rows.some(item => item.id === initialStartId)) {
        const sharedItem = await readingPracticeService.getPreview(initialStartId);
        if (sharedItem?.isPublished) return [sharedItem, ...rows];
      }
      return rows;
    },
  });
  const completed = usePageDataQuery({
    queryKey: ['practice', 'reading', 'completed'],
    queryFn: readingPracticeService.getCompletedPassageIds,
    enabled: active && workspaceMode && isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const items = catalog.data ?? EMPTY_ITEMS;
  const access = useContentAccessDecisions(active ? items.map(item => targetFor(item.id)) : []);
  const loading = catalog.isPending;
  const loadError = catalog.isError && !catalog.data;
  const [paymeOpen, setPaymeOpen] = useState(false);
  const [continueDialogItem, setContinueDialogItem] = useState<ReadingPracticeListCard | null>(null);
  const [membershipRequiredOpen, setMembershipRequiredOpen] = useState(false);
  const [paidConfirmItem, setPaidConfirmItem] = useState<ReadingPracticeListCard | null>(null);
  const [pendingPurchaseItem, setPendingPurchaseItem] = useState<ReadingPracticeListCard | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const completedPassageIds = useMemo(
    () => new Set(completed.data ?? EMPTY_COMPLETED_IDS), [completed.data],
  );

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        filterStorageKey(workspaceMode),
        JSON.stringify({ levelFilter, sectionFilter, sortMode }),
      );
    } catch {
      // Filters still work when browser storage is unavailable.
    }
  }, [levelFilter, sectionFilter, sortMode, workspaceMode]);

  const itemsWithState = useMemo(
    () =>
      items.map((item) => {
        const savedProgress = workspaceMode ? readSavedProgress(item.id) : null;
        const isCompleted = workspaceMode && completedPassageIds.has(item.id);
        const answeredCount =
          savedProgress?.answeredCount ??
          Object.values(savedProgress?.answers || {}).filter((value) => String(value || "").trim()).length;
        return {
          ...item,
          coverImageUrl: normalizeCoverImage(item.coverImageUrl),
          topic: item.topic?.trim() || "Genel tema",
          coinCost: getCoinCost(item),
          savedProgress,
          answeredCount,
          hasProgress: Boolean(savedProgress && answeredCount > 0),
          isCompleted,
          isWorked:
            workspaceMode &&
            (isCompleted || Boolean(savedProgress && answeredCount > 0)),
        };
      }),
    [completedPassageIds, items, workspaceMode],
  );

  const visibleItems = useMemo(() => {
    const next = [...itemsWithState].filter((item) => {
      if (levelFilter === "tum") return true;
      return String(item.level || "").toUpperCase() === levelFilter;
    });

    next.sort((left, right) => {
      if (access.enabled) {
        // The complete server-ordered list is loaded; explicit worked sorting
        // only rearranges within each public/other group, never across pages.
        if (sortMode !== "calisilmayanlar" || left.isPublicFree !== right.isPublicFree) return 0;
        return left.isWorked === right.isWorked ? 0 : left.isWorked ? 1 : -1;
      }
      if (sortMode === "eski") {
        return new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
      }
      if (sortMode === "calisilmayanlar") {
        if (left.isWorked !== right.isWorked) return left.isWorked ? 1 : -1;
        return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
      }
      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    });

    return next;
  }, [itemsWithState, levelFilter, sortMode, access.enabled]);

  const displayedItems = useMemo(
    () =>
      visibleItems.filter(
        (item) =>
          sectionFilter === "tum" ||
          (item.practiceType === "SECTION" && item.sectionNumber === sectionFilter),
      ),
    [sectionFilter, visibleItems],
  );

  const startNavigation = (item: ReadingPracticeListCard, attemptId: string, resume = false) => {
    const progress = readSavedProgress(item.id);
    const sure =
      resume && progress?.timerEnabled ? progress.timerMinutes : Math.max(20, Number(item.estimatedMinutes || 20));
    const sayac = resume && progress?.timerEnabled ? 1 : 0;
    const params = new URLSearchParams({
      mod: "calisma",
      sayac: String(sayac),
      sure: String(sure),
      attemptId,
    });
    navigate(`${PRACTICE_BASE_PATH}/${item.id}?${params.toString()}`);
  };

  const startPractice = async (item: ReadingPracticeListCard, options?: { resume?: boolean; restart?: boolean }) => {
    const resume = options?.resume ?? false;
    const restart = options?.restart ?? false;

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          mode: "register",
          redirectTo: `/app/pratik?bolum=reading&start=${encodeURIComponent(item.id)}`,
        },
      });
      return;
    }

    const savedProgress = readSavedProgress(item.id);
    if (resume && savedProgress?.attemptId) {
      if (access.enabled) {
        if (savedProgress.ownerId && savedProgress.ownerId !== user?.id) { toast.error('Taslağınız korunuyor. Kendi hesabınızla devam edin.'); return; }
        const recovered = await readingPracticeService.getSolveDetail(item.id, savedProgress.attemptId);
        if (!recovered || !user?.id || readAccessOwner() !== user.id) { toast.error('Önceki oturum doğrulanamadı. Taslağınız korunuyor.'); return; }
        localStorage.setItem(`reading-practice-progress:${item.id}`, JSON.stringify({ ...savedProgress, ownerId: user.id }));
        publishCurrentActivity(user.id, 'READING', { contentId: item.id, attemptId: savedProgress.attemptId, target: targetFor(item.id) });
      }
      startNavigation(item, savedProgress.attemptId, true);
      return;
    }

    setStartingId(item.id);
    let startResult;
    try {
      const accessContextId = access.enabled && user?.id ? await bindNormalAccess(user.id, targetFor(item.id)) : undefined;
      startResult = await readingPracticeService.start(item.id, { accessContextId });
    } catch { toast.error('Erişiminiz doğrulanamadı. Taslağınız korunuyor.'); }
    finally { setStartingId(null); }

    if (!startResult || (access.enabled && readAccessOwner() !== user?.id)) return;

    if (startResult.errorCode === "INSUFFICIENT_COINS") {
      setPendingPurchaseItem(item);
      setPaymeOpen(true);
      return;
    }

    if (!startResult.attemptId) {
      toast.error("Okuma çalışması oturumu başlatılamadı.");
      return;
    }

    if (access.enabled && user?.id) publishCurrentActivity(user.id, 'READING', { contentId: item.id, attemptId: startResult.attemptId, target: targetFor(item.id) });
    if (restart) clearSavedProgress(item.id);
    await refreshUser().catch(() => undefined);
    startNavigation(item, startResult.attemptId, resume);
  };

  const requiresMembership = (item: ReadingPracticeListItem) =>
    !item.isFreeAccess && (isSubscriptionBillingEnabled || Boolean(item.isFreeAccessManaged));
  const isMembershipLocked = (item: ReadingPracticeListItem) =>
    access.pending ? true : access.enabled ? isContentLocked(access.decisionFor(targetFor(item.id))) : requiresMembership(item) && !hasActiveMembership;

  const handleCardStart = (item: ReadingPracticeListCard) => {
    if (!workspaceMode) {
      openStudentAction(`/app/pratik/okuma?start=${item.id}`);
      return;
    }

    if (access.pending || (!access.enabled && requiresMembership(item) && membershipPending)) return;
    if (isMembershipLocked(item)) {
      setMembershipRequiredOpen(true);
      return;
    }

    if (item.hasProgress) {
      setContinueDialogItem(item);
      return;
    }

    if (getCoinCost(item) > 0) {
      setPaidConfirmItem(item);
      return;
    }

    void startPractice(item);
  };

  useEffect(() => {
    if (
      !workspaceMode ||
      !initialStartId ||
      loading ||
      loadError ||
      handledStartIntentRef.current === initialStartId
    ) {
      return;
    }

    const item = itemsWithState.find((candidate) => candidate.id === initialStartId);
    if (!item) return;
    if (access.pending || (!access.enabled && requiresMembership(item) && membershipPending)) return;

    handledStartIntentRef.current = initialStartId;
    onStartIntentHandled?.();
    handleCardStart(item);
    // The handled-intent ref makes this idempotent while using the latest
    // decision/filter state on every render (including a pending→ready change).
  });

  const handlePaidConfirm = async () => {
    if (!paidConfirmItem) return;
    const target = paidConfirmItem;
    setPaidConfirmItem(null);
    await startPractice(target);
  };

  const handlePurchaseSuccess = async () => {
    await refreshUser().catch(() => undefined);
    setPaymeOpen(false);
    toast.success("Kredi hesabına eklendi.");
  };

  const renderPracticeCard = (item: ReadingPracticeListCard) => (
    <article
      key={item.id}
      role="button"
      tabIndex={startingId === item.id ? -1 : 0}
      aria-disabled={startingId === item.id}
      aria-label={`${item.passageTitle || item.title} — ${isMembershipLocked(item) ? "abonelik uyarısını aç" : workspaceMode && item.hasProgress ? "devam et" : "pratiği başlat"}`}
      aria-busy={access.pending || (!access.enabled && requiresMembership(item) && membershipPending) || undefined}
      onClick={() => {
        if (startingId !== item.id) handleCardStart(item);
      }}
      onKeyDown={(event) => {
        if (startingId === item.id || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        handleCardStart(item);
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-[var(--tm-border-subtle)] bg-white transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-px hover:border-[#a5a59d] hover:shadow-[0_3px_12px_rgba(55,53,47,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tm-focus)] aria-disabled:cursor-wait aria-disabled:opacity-60 motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-[2/1] overflow-hidden bg-[var(--tm-bg-muted)]">
        {item.coverImageUrl ? (
          <PracticeCoverImage practiceId={item.id} src={item.coverImageUrl} alt={item.passageTitle || item.title} />
        ) : (
          <div className="h-full w-full" style={{ background: DEFAULT_COVER }} />
        )}
        {item.level ? (
          <div className="absolute left-2 top-2">
            <span className="inline-flex rounded-md bg-white px-2 py-0.5 text-xs font-medium text-black shadow-sm">
              {item.level}
              {item.practiceType === "SECTION" && item.sectionNumber
                ? ` · Bölüm ${item.sectionNumber}`
                : ""}
            </span>
          </div>
        ) : null}
        {(!access.pending && (access.enabled ? access.decisionFor(targetFor(item.id))?.isPublicFree : item.isFreeAccess)) ? (
          <span className="absolute right-2 top-2 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-[#236b42] shadow-sm">
            Ücretsiz
          </span>
        ) : null}
        {(access.pending || access.enabled || !membershipPending) && isMembershipLocked(item) && <MembershipLockBadge />}
      </div>

      <div className="min-h-[68px] min-w-0 flex-1 px-4 pt-4">
        <div className="flex items-start gap-3">
          <h3 className="min-w-0 flex-1 text-base font-semibold text-[var(--tm-text-primary)]">
            {item.passageTitle || item.title}
          </h3>
          {item.isCompleted ? (
            <span
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-[#2f7d4c]"
              aria-label="Çalışma tamamlandı"
              title="Çalışma tamamlandı"
            >
              <Check className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" />
            </span>
          ) : null}
        </div>
      </div>

      <div className="mx-4 mb-2 mt-2 inline-flex min-h-10 items-center justify-between gap-1.5 text-sm font-medium text-[var(--tm-text-primary)]">
        {workspaceMode && item.hasProgress ? "Devam et" : "Pratik Yap"}
        <ChevronRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </div>
    </article>
  );

  return (
    <main className={embedded ? "text-[var(--tm-text-primary)]" : `min-h-screen ${tm.page}`}>
      {!embedded ? (
        <PageIntro
          eyebrow="Pratik / Okuma"
          title="Okuma Pratiği"
          description={
            workspaceMode
              ? "Metinleri seç, çalışma temposunu koru ve kaldığın yerden devam et."
              : "Yayınlanmış okuma pratiklerini incele. Başlamak için öğrenci alanına geç."
          }
        >
          <button
            type="button"
            className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--tm-text-secondary)] transition-colors hover:text-[var(--tm-text-primary)]"
            onClick={() => (onBack ? onBack() : navigate("/pratik"))}
          >
            <ArrowLeft className="h-4 w-4" />
            Geri
          </button>
        </PageIntro>
      ) : null}

      <section className={inlineToolbar ? '' : embedded ? "py-2 sm:py-4" : tm.section}>
        <div className={embedded ? 'w-full' : tm.container}>
          <div className={inlineToolbar ? "mb-4 flex justify-end gap-1 md:absolute md:right-0 md:top-0 md:mb-0" : "mb-6 flex flex-wrap items-center justify-end gap-1"}>
            <Select value={levelFilter} onValueChange={(value: LevelFilter) => setFilters(previous => ({ ...previous, levelFilter: value }))}>
              <SelectTrigger aria-label="Seviyeye göre filtrele" className="h-9 w-auto min-w-[124px] gap-2 border-0 bg-transparent px-3 text-[13px] font-medium shadow-none hover:bg-[var(--tm-bg-hover)] focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--tm-border-subtle)] bg-white">
                {[
                  ['tum', 'Tüm seviyeler'],
                  ['A1', 'A1'],
                  ['A2', 'A2'],
                  ['B1', 'B1'],
                  ['B2', 'B2'],
                  ['C1', 'C1'],
                  ['MULTILEVEL', 'Multilevel'],
                ].map(([value, label]) => (
                  <SelectItem key={value} value={value} className="focus:bg-[var(--tm-bg-hover)] focus:text-[var(--tm-text-primary)] data-[state=checked]:bg-[var(--tm-bg-muted)] data-[state=checked]:text-[var(--tm-text-primary)]">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(sectionFilter)}
              onValueChange={(value) =>
                setFilters(previous => ({ ...previous, sectionFilter: value === "tum" ? "tum" : (Number(value) as SectionFilter) }))
              }
            >
              <SelectTrigger aria-label="Okuma bölümüne göre filtrele" className="h-9 w-auto min-w-[128px] gap-2 border-0 bg-transparent px-3 text-[13px] font-medium shadow-none hover:bg-[var(--tm-bg-hover)] focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--tm-border-subtle)] bg-white">
                {[
                  ['tum', 'Tüm bölümler'],
                  ['1', 'Bölüm 1'],
                  ['2', 'Bölüm 2'],
                  ['3', 'Bölüm 3'],
                  ['4', 'Bölüm 4'],
                  ['5', 'Bölüm 5'],
                ].map(([value, label]) => (
                  <SelectItem key={value} value={value} className="focus:bg-[var(--tm-bg-hover)] focus:text-[var(--tm-text-primary)] data-[state=checked]:bg-[var(--tm-bg-muted)] data-[state=checked]:text-[var(--tm-text-primary)]">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortMode} onValueChange={(value: SortMode) => setFilters(previous => ({ ...previous, sortMode: value }))}>
              <SelectTrigger aria-label="Pratikleri sırala" className="h-9 w-auto min-w-[104px] gap-2 border-0 bg-transparent px-3 text-[13px] font-medium shadow-none hover:bg-[var(--tm-bg-hover)] focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--tm-border-subtle)] bg-white">
                <SelectItem value="yeni" className="focus:bg-[var(--tm-bg-hover)] focus:text-[var(--tm-text-primary)] data-[state=checked]:bg-[var(--tm-bg-muted)] data-[state=checked]:text-[var(--tm-text-primary)]">En yeni</SelectItem>
                <SelectItem value="eski" className="focus:bg-[var(--tm-bg-hover)] focus:text-[var(--tm-text-primary)] data-[state=checked]:bg-[var(--tm-bg-muted)] data-[state=checked]:text-[var(--tm-text-primary)]">En eski</SelectItem>
                {workspaceMode ? <SelectItem value="calisilmayanlar" className="focus:bg-[var(--tm-bg-hover)] focus:text-[var(--tm-text-primary)] data-[state=checked]:bg-[var(--tm-bg-muted)] data-[state=checked]:text-[var(--tm-text-primary)]">Çalışılmayanlar</SelectItem> : null}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-16 text-center text-[var(--tm-text-secondary)]">Testler yükleniyor...</div>
          ) : loadError ? (
            <Surface className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-[var(--tm-text-primary)]">
                Okuma pratikleri şu anda yüklenemedi.
              </p>
              <p className="mt-2 text-sm text-[var(--tm-text-secondary)]">
                Bağlantınızı kontrol edip yeniden deneyin.
              </p>
              <button
                type="button"
                onClick={() => void catalog.refetch()}
                className={`${tm.subtleButton} mt-5 h-9 px-3 text-sm font-semibold`}
              >
                Tekrar dene
              </button>
            </Surface>
          ) : items.length === 0 ? (
            <Surface className="px-6 py-12 text-center text-[var(--tm-text-secondary)]">
              Henüz yayınlanmış okuma pratiği bulunmuyor.
            </Surface>
          ) : displayedItems.length === 0 ? (
            <Surface className="px-6 py-12 text-center text-[var(--tm-text-secondary)]">
              Filtrelere uygun çalışma bulunamadı.
            </Surface>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {displayedItems.map(renderPracticeCard)}
            </div>
          )}
        </div>
      </section>

      <MembershipRequiredDialog open={membershipRequiredOpen} onOpenChange={setMembershipRequiredOpen} />
      <Dialog open={Boolean(continueDialogItem)} onOpenChange={(open) => !open && setContinueDialogItem(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[400px] gap-5 rounded-[8px] border border-[var(--tm-border-subtle)] p-7 sm:max-w-[400px] sm:rounded-[8px] sm:p-8">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="pr-6 text-[18px] leading-6 text-[var(--tm-text-primary)]">Çalışmaya nasıl devam edilsin?</DialogTitle>
            <DialogDescription className="text-[14px] leading-6 text-[var(--tm-text-secondary)]">
              Bu testte yarım kalan cevapların var. Kaldığın yerden devam edebilir veya baştan başlayabilirsin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2.5 sm:flex-col sm:space-x-0">
            <Button
              className="h-11 w-full rounded-[8px] bg-red-600 text-[14px] font-semibold text-white hover:bg-red-700"
              onClick={() => {
                if (!continueDialogItem) return;
                const target = continueDialogItem;
                setContinueDialogItem(null);
                void startPractice(target, { resume: true });
              }}
            >
              <Play className="mr-2 h-4 w-4" />
              Devam et
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full rounded-[8px] border-[#d9d9d5] text-[14px] font-semibold text-[var(--tm-text-primary)] hover:bg-[var(--tm-bg-hover)]"
              onClick={() => {
                if (!continueDialogItem) return;
                const target = continueDialogItem;
                setContinueDialogItem(null);
                if (getCoinCost(target) > 0) {
                  setPaidConfirmItem(target);
                  return;
                }
                void startPractice(target, { restart: true });
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Baştan başla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(paidConfirmItem)} onOpenChange={(open) => !open && setPaidConfirmItem(null)}>
        <DialogContent className="rounded-lg border border-[var(--tm-border-subtle)] bg-white px-0 py-0 shadow-[var(--tm-shadow-popover)] sm:max-w-[420px]">
          <DialogHeader>
            <div className="px-6 pb-3 pt-6 text-left">
              <DialogTitle className="text-[20px] font-semibold tracking-[-0.025em] text-[var(--tm-text-primary)]">
                Testi başlat
              </DialogTitle>
              <DialogDescription className="mt-2 text-[14px] leading-6 text-[var(--tm-text-secondary)]">
                {paidConfirmItem ? `${getCoinCost(paidConfirmItem)} kredi kullanılacak.` : ""}
              </DialogDescription>
            </div>
          </DialogHeader>
          {paidConfirmItem ? (
            <div className="px-6 pb-5">
              <div className="rounded-lg bg-[var(--tm-bg-app)] px-4 py-4">
                <div className="min-w-0">
                  <div className="text-[22px] font-semibold leading-[1.08] tracking-[-0.03em] text-[var(--tm-text-primary)]">
                    {paidConfirmItem.title}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-md bg-white px-4 py-3">
                    <span className="text-[14px] text-[var(--tm-text-secondary)]">Kredi</span>
                    <span className="inline-flex items-center gap-1.5 text-[16px] font-semibold text-[var(--tm-text-primary)]">
                      <Coins className="h-4 w-4 text-[var(--tm-accent)]" />
                      {getCoinCost(paidConfirmItem)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-white px-4 py-3">
                    <span className="text-[14px] text-[var(--tm-text-secondary)]">Mevcut kredin</span>
                    <span className="inline-flex items-center gap-1.5 text-[16px] font-semibold text-[var(--tm-text-primary)]">
                      <Coins className="h-4 w-4 text-[var(--tm-text-primary)]" />
                      {Number(user?.coin || 0)}
                    </span>
                  </div>
                  {Math.max(0, getCoinCost(paidConfirmItem) - Number(user?.coin || 0)) > 0 ? (
                    <div className="flex items-center justify-between rounded-2xl bg-[#fff4f4] px-4 py-3">
                      <span className="text-[14px] text-[#9f3535]">Eksik kredi</span>
                      <span className="inline-flex items-center gap-1.5 text-[16px] font-semibold text-[#c62828]">
                        <Coins className="h-4 w-4 text-[#c62828]" />
                        {Math.max(0, getCoinCost(paidConfirmItem) - Number(user?.coin || 0))}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 px-1 text-[13px] leading-6 text-[var(--tm-text-secondary)]">
                Baştan yeniden başlatırsan kredi tekrar kullanılır.
              </div>
            </div>
          ) : null}
          <DialogFooter className="flex-col gap-2 px-6 pb-6 pt-0 sm:flex-col">
            {paidConfirmItem && Math.max(0, getCoinCost(paidConfirmItem) - Number(user?.coin || 0)) > 0 ? (
              <Button
                className={`${tm.primaryButton} h-11 w-full text-[15px] font-medium`}
                onClick={() => {
                  setPendingPurchaseItem(paidConfirmItem);
                  setPaidConfirmItem(null);
                  setPaymeOpen(true);
                }}
              >
                Kredi satın al
              </Button>
            ) : (
              <Button className={`${tm.primaryButton} h-11 w-full text-[15px] font-medium`} onClick={() => void handlePaidConfirm()}>
                Testi başlat
              </Button>
            )}
            <Button variant="outline" className={`${tm.subtleButton} h-11 w-full text-[15px]`} onClick={() => setPaidConfirmItem(null)}>
              Vazgeç
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isSubscriptionBillingEnabled && <PaymeCheckoutModal
        isOpen={paymeOpen}
        onClose={() => setPaymeOpen(false)}
        planName="Kredi Satın Al"
        planId="quick"
        initialUnits={pendingPurchaseItem ? Math.max(1, getCoinCost(pendingPurchaseItem) - Number(user?.coin || 0)) : undefined}
        onSuccess={handlePurchaseSuccess}
      />}
    </main>
  );
}
