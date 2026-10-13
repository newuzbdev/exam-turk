import ContentAccessRecovery from '@/components/subscription/ContentAccessRecovery';
import { readWritingPracticeAccess, saveWritingPracticeAccess, saveWritingPracticePaidContinuation } from '@/pages/writing-practice/writing-practice-storage';
import { saveOwnedAccess } from '@/utils/access-link-context';
import { useAuth } from '@/contexts/AuthContext';
import { usePageDataQuery } from '@/hooks/use-page-data-query';
import { useContentAccessDecisions } from '@/hooks/use-content-access';
import { isContentLocked } from '@/utils/content-access';
import { bindNormalAccess } from '@/utils/normal-access-entry';
import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import listeningPracticeService from "@/services/listeningPractice.service";
import speakingPracticeService from "@/services/speakingPractice.service";
import type {
  PracticeDomain,
  PracticeListItem,
} from "@/services/practice.types";
import writingPracticeService from "@/services/writingPractice.service";
import { toast } from "sonner";
import {
  clearWritingPracticeProgress,
  hasUnfinishedWritingPractice,
} from "@/pages/writing-practice/writing-practice-storage";
import PracticeResumeDialog from "./PracticeResumeDialog";
import PracticeCoverImage from "./PracticeCoverImage";
import MembershipLockBadge from "@/components/subscription/MembershipLockBadge";
import MembershipRequiredDialog from "@/components/subscription/MembershipRequiredDialog";

const routeSegment: Record<PracticeDomain, string> = {
  LISTENING: "dinleme",
  WRITING: "yazma",
  SPEAKING: "konusma",
};

const sectionLabel = (code: string) => {
  const value = code
    .replace("PART_", "")
    .replace("TASK_", "")
    .replace(/_/g, ".");
  return `Bölüm ${value}`;
};

const fallbackCover: Record<PracticeDomain, string> = {
  LISTENING: "linear-gradient(135deg,#dfe9e2,#eef4ef 55%,#d6dfd9)",
  WRITING: "#ffffff",
  SPEAKING: "linear-gradient(135deg,#eee5d5,#faf5eb 55%,#e5d8c2)",
};

const levelOptions = ["A1", "A2", "B1", "B2", "C1", "MULTILEVEL"] as const;

const sectionOptions: Record<PracticeDomain, readonly string[]> = {
  LISTENING: ["PART_1", "PART_2", "PART_3", "PART_4", "PART_5", "PART_6"],
  WRITING: ["TASK_1_1", "TASK_1_2", "TASK_2"],
  SPEAKING: ["TASK_1_1", "TASK_1_2", "TASK_2", "TASK_3"],
};

type SortMode = "newest" | "oldest";

const filterStorageKey = (domain: PracticeDomain) =>
  `practice-filters:${domain.toLowerCase()}`;

const readSavedFilters = (domain: PracticeDomain) => {
  const defaults = { level: "all", section: "all", sort: "newest" as SortMode };
  if (typeof window === "undefined") return defaults;
  try {
    const saved = JSON.parse(
      window.sessionStorage.getItem(filterStorageKey(domain)) || "null",
    );
    if (!saved || typeof saved !== "object") return defaults;
    return {
      level: typeof saved.level === "string" ? saved.level : defaults.level,
      section:
        typeof saved.section === "string" ? saved.section : defaults.section,
      sort: saved.sort === "oldest" ? ("oldest" as SortMode) : defaults.sort,
    };
  } catch {
    return defaults;
  }
};

const selectItemClass =
  "focus:bg-[var(--tm-bg-hover)] focus:text-[var(--tm-text-primary)] data-[state=checked]:bg-[var(--tm-bg-muted)] data-[state=checked]:text-[var(--tm-text-primary)]";

const selectTriggerClass =
  "h-9 w-auto gap-2 border-0 bg-transparent px-3 text-[13px] font-medium shadow-none hover:bg-[var(--tm-bg-hover)] focus:ring-0 focus:ring-offset-0";

const serviceByDomain = {
  LISTENING: listeningPracticeService,
  WRITING: writingPracticeService,
  SPEAKING: speakingPracticeService,
} satisfies Record<PracticeDomain, { list: () => Promise<PracticeListItem[]> }>;

export default function PracticeList({
  domain,
  hasActiveMembership = false,
  membershipPending = false,
  active = true,
}: {
  domain: PracticeDomain;
  hasActiveMembership?: boolean;
  membershipPending?: boolean;
  active?: boolean;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState(() => readSavedFilters(domain));
  const [continueDialogItem, setContinueDialogItem] =
    useState<PracticeListItem | null>(null);
  const [membershipRequiredOpen, setMembershipRequiredOpen] = useState(false);
  const { level, section, sort } = filters;
  const catalog = usePageDataQuery({
    queryKey: ['practice', domain, 'catalog', sort],
    queryFn: () => serviceByDomain[domain].list({ order: sort }),
    enabled: active,
  });
  const items = useMemo(() => catalog.data ?? [], [catalog.data]);
  const loading = catalog.isPending;
  const targetFor = (id: string) => ({ scope: `PRACTICE_${domain}` as const, targetId: id });
  const access = useContentAccessDecisions(active ? items.map(item => targetFor(item.id)) : []);
  const [blockedItem, setBlockedItem] = useState<PracticeListItem | null>(null);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        filterStorageKey(domain),
        JSON.stringify(filters),
      );
    } catch {
      // Filters remain usable when browser storage is unavailable.
    }
  }, [domain, filters]);

  const filtered = useMemo(
    () =>
      items
        .filter(
          (item) =>
            (section === "all" || item.sectionCode === section) &&
            (level === "all" || item.level === level),
        )
        .sort((a, b) => {
          if (access.enabled) return 0; // Keep the server public-first order.
          const difference =
            domain === "SPEAKING"
              ? a.title.localeCompare(b.title, "tr", { numeric: true })
              : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          return sort === "newest" ? difference : -difference;
        }),
    [domain, items, level, section, sort, access.enabled],
  );
  const availableSections = new Set(items.map((item) => item.sectionCode));
  const sections = sectionOptions[domain].filter((value) =>
    availableSections.has(value),
  );
  const isMembershipLocked = (item: PracticeListItem) =>
    access.pending ? true : access.enabled ? isContentLocked(access.decisionFor(targetFor(item.id))) : !item.isFreeAccess && !hasActiveMembership;
  const enterPractice = async (item: PracticeListItem, restart = false) => {
    if (entering) return;
    setEntering(true);
    try {
      let contextId: string | undefined;
      if (access.enabled && user?.id) {
        const saved = domain === 'WRITING' && !restart && hasUnfinishedWritingPractice(item.id) ? readWritingPracticeAccess(item.id) : null;
        if (saved && saved.ownerId !== user.id) throw new Error('Draft belongs to another account');
        contextId = saved?.paidContinuationContextId || saved?.contextId || await bindNormalAccess(user.id, targetFor(item.id));
        if (saved) saveOwnedAccess(user.id, targetFor(item.id), { target: targetFor(item.id), contextId });
      }
      if (restart) clearWritingPracticeProgress(item.id);
      if (domain === 'WRITING' && user?.id && contextId) saveWritingPracticeAccess(item.id, user.id, contextId);
      navigate(`/app/pratik/${routeSegment[domain]}/${item.id}`);
    } catch { toast.error("Erişiminiz doğrulanamadı. Taslağınız korunuyor."); } finally { setEntering(false); }
  };
  const startPractice = (item: PracticeListItem) => {
    if (access.pending || entering || (!access.enabled && !item.isFreeAccess && membershipPending)) return;
    if (isMembershipLocked(item)) {
      const reason = access.decisionFor(targetFor(item.id))?.blockedReason;
      if (access.enabled && (reason === 'AI_LIMIT' || reason === 'EXPIRED')) { setBlockedItem(item); return; }
      setMembershipRequiredOpen(true);
      return;
    }
    if (domain === "WRITING" && hasUnfinishedWritingPractice(item.id)) {
      setContinueDialogItem(item);
      return;
    }
    void enterPractice(item);
  };

  if (loading) {
    return (
      <p className="py-10 text-sm text-[var(--tm-text-secondary)]">
        Pratikler yükleniyor…
      </p>
    );
  }

  return (
    <section aria-label="Beceri pratikleri">
      <div className="mb-4 flex flex-wrap justify-end gap-1 md:absolute md:right-0 md:top-0 md:mb-0">
        <Select
          value={level}
          onValueChange={(value) =>
            setFilters((current) => ({ ...current, level: value }))
          }
        >
          <SelectTrigger
            aria-label="Seviyeye göre filtrele"
            className={`${selectTriggerClass} min-w-[124px]`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[var(--tm-border-subtle)] bg-white">
            <SelectItem value="all" className={selectItemClass}>
              Tüm seviyeler
            </SelectItem>
            {levelOptions.map((value) => (
              <SelectItem key={value} value={value} className={selectItemClass}>
                {value === "MULTILEVEL" ? "Multilevel" : value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={section}
          onValueChange={(value) =>
            setFilters((current) => ({ ...current, section: value }))
          }
        >
          <SelectTrigger
            aria-label="Bölüme göre filtrele"
            className={`${selectTriggerClass} min-w-[128px]`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[var(--tm-border-subtle)] bg-white">
            <SelectItem value="all" className={selectItemClass}>
              Tüm bölümler
            </SelectItem>
            {sections.map((value) => (
              <SelectItem key={value} value={value} className={selectItemClass}>
                {sectionLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sort}
          onValueChange={(value: SortMode) =>
            setFilters((current) => ({ ...current, sort: value }))
          }
        >
          <SelectTrigger
            aria-label="Pratikleri sırala"
            className={`${selectTriggerClass} min-w-[104px]`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[var(--tm-border-subtle)] bg-white">
            <SelectItem value="newest" className={selectItemClass}>
              {domain === "SPEAKING" ? "Numara: 1–7" : "En yeni"}
            </SelectItem>
            <SelectItem value="oldest" className={selectItemClass}>
              {domain === "SPEAKING" ? "Numara: 7–1" : "En eski"}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--tm-border-subtle)] bg-white px-6 py-12 text-center text-sm text-[var(--tm-text-secondary)]">
          Bu bölüm için henüz yayınlanmış pratik yok.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              role="button"
              tabIndex={0}
              aria-label={`${item.title} — ${isMembershipLocked(item) ? "abonelik uyarısını aç" : domain === "WRITING" && hasUnfinishedWritingPractice(item.id) ? "devam et" : "pratiği başlat"}`}
              aria-busy={access.pending || entering || (!access.enabled && !item.isFreeAccess && membershipPending) || undefined}
              onClick={() => startPractice(item)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                startPractice(item);
              }}
              className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-[var(--tm-border-subtle)] bg-white transition-[transform,border-color,box-shadow] hover:-translate-y-px hover:border-[#a5a59d] hover:shadow-[0_3px_12px_rgba(55,53,47,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tm-focus)]"
            >
              <div
                className={`relative aspect-[2/1] overflow-hidden ${domain === "WRITING" ? "bg-white" : "bg-[var(--tm-bg-muted)]"}`}
              >
                {item.coverImageUrl ? (
                  <PracticeCoverImage
                    practiceId={item.id}
                    src={item.coverImageUrl}
                    alt=""
                  />
                ) : (
                  <div
                    className="h-full w-full"
                    style={{ background: fallbackCover[domain] }}
                  />
                )}
                <span className="absolute left-2 top-2 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-black shadow-sm">
                  {sectionLabel(item.sectionCode)}
                </span>
                {(access.pending || access.enabled || !membershipPending) && isMembershipLocked(item) && <MembershipLockBadge />}
              </div>
              {access.enabled && access.decisionFor(targetFor(item.id))?.isPublicFree && <span className="px-4 pt-2 text-xs text-[#777570]">Ücretsiz</span>}
              <div className="min-h-[68px] min-w-0 flex-1 px-4 pt-4">
                <h3 className="text-base font-semibold text-[var(--tm-text-primary)]">
                  {item.title}
                </h3>
              </div>
              <div className="mx-4 mb-2 mt-2 flex min-h-10 items-center justify-between text-sm font-medium text-[var(--tm-text-primary)]">
                <span>
                  {domain === "WRITING" && hasUnfinishedWritingPractice(item.id)
                    ? "Devam et"
                    : "Pratik Yap"}
                </span>
                <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </article>
          ))}
        </div>
      )}
      <PracticeResumeDialog
        open={Boolean(continueDialogItem)}
        onOpenChange={(open) => !open && setContinueDialogItem(null)}
        onContinue={() => {
          if (!continueDialogItem) return;
          void enterPractice(continueDialogItem);
          setContinueDialogItem(null);
        }}
        onRestart={() => {
          if (!continueDialogItem) return;
          void enterPractice(continueDialogItem, true);
          setContinueDialogItem(null);
        }}
      />
      {blockedItem && <ContentAccessRecovery error={{ response: { status: 402, data: { message: access.decisionFor(targetFor(blockedItem.id))?.blockedReason || 'AI_LIMIT' } } }} target={targetFor(blockedItem.id)} onClose={() => setBlockedItem(null)} onPaid={contextId => {
        if (!user?.id) return;
        saveOwnedAccess(user.id, targetFor(blockedItem.id), { target: targetFor(blockedItem.id), contextId });
        if (domain === 'WRITING') saveWritingPracticePaidContinuation(blockedItem.id, user.id, contextId);
        navigate(`/app/pratik/${routeSegment[domain]}/${blockedItem.id}`);
      }} />}
      <MembershipRequiredDialog open={membershipRequiredOpen} onOpenChange={setMembershipRequiredOpen} />
    </section>
  );
}
