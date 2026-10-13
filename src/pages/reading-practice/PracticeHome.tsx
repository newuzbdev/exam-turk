import { useEffect, useRef, useState } from 'react';
import { useAccessCatalogSummary } from '@/hooks/use-content-access';
import { initialFreeGroup } from '@/utils/content-access';
import { useNavigate, useSearchParams } from "react-router-dom";
import * as Tabs from '@radix-ui/react-tabs';
import '../lessons/lesson-catalog.css';
import ReadingPracticeList from './ReadingPracticeList';
import PracticeList from '@/components/practice/PracticeList';
import PracticeDirectEntry from '@/components/practice/PracticeDirectEntry';
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscriptionService,
  subscriptionStatusQueryKey,
} from "@/services/subscription.service";
import {
  ArrowRight,
  BookOpen,
  Ear,
  Mic,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import {
  categoryStyle,
  StudentPageShell,
  type TmCategory,
} from "@/components/tm";

const bolumler: {
  baslik: string;
  aciklama: string;
  category: TmCategory;
  ikon: LucideIcon;
  yol: string;
  hazir: boolean;
}[] = [
  {
    baslik: "Dinleme",
    aciklama:
      "Dinleme bölümlerinin sınav düzenini ayrı ayrı inceleyin.",
    category: "listening",
    ikon: Ear,
    yol: "/pratik/dinleme",
    hazir: true,
  },
  {
    baslik: "Okuma",
    aciklama:
      "Metinleri okuyun, soruları yanıtlayarak okuma becerinizi geliştirin.",
    category: "reading",
    ikon: BookOpen,
    yol: "/pratik/okuma",
    hazir: true,
  },
  {
    baslik: "Yazma",
    aciklama:
      "Gerçek sınav düzenindeki yazma görevlerini bölüm bölüm çalışın.",
    category: "writing",
    ikon: Pencil,
    yol: "/pratik/yazma",
    hazir: true,
  },
  {
    baslik: "Konuşma",
    aciklama:
      "Gerçek sınav düzenindeki konuşma görevlerini bölüm bölüm çalışın.",
    category: "speaking",
    ikon: Mic,
    yol: "/pratik/konusma",
    hazir: true,
  },
];

export default function PracticeHome({
  basePath = "/pratik",
  workspaceMode = false,
}: {
  basePath?: string;
  workspaceMode?: boolean;
}) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const membership = useQuery({
    queryKey: user?.id ? [...subscriptionStatusQueryKey, user.id] : subscriptionStatusQueryKey,
    queryFn: subscriptionService.getStatus,
    enabled: isAuthenticated,
    retry: 1,
  });
  const membershipPending = isAuthenticated && membership.isPending;
  const hasActiveMembership = Boolean(isAuthenticated && membership.data?.isActive);
  const [params, setParams] = useSearchParams();
  const summary = useAccessCatalogSummary();
  const [defaultDomain, setDefaultDomain] = useState('reading');
  const initialChoice = useRef(false);
  useEffect(() => {
    if (initialChoice.current || !summary.data) return;
    initialChoice.current = true;
    const free = initialFreeGroup(summary.data.groups.filter(group => group.scope.startsWith('PRACTICE_')), params.size > 0 || hasSavedPracticeFilter());
    if (free) setDefaultDomain(free.scope.slice(9).toLowerCase());
  }, [summary.data, params]);
  const selected = bolumler.find(item => item.category === params.get('bolum'))?.category ?? defaultDomain;
  const startPracticeId = params.get('start');
  const [visited, setVisited] = useState({ ownerId: user?.id, categories: [selected] });
  useEffect(() => {
    setVisited(previous => previous.ownerId !== user?.id
      ? { ownerId: user?.id, categories: [selected] }
      : previous.categories.includes(selected) ? previous
      : { ...previous, categories: [...previous.categories, selected] });
  }, [selected, user?.id]);

  return (
    <StudentPageShell
      title="Pratik"
    >
      {startPracticeId && workspaceMode ? <PracticeDirectEntry key={`${selected}:${startPracticeId}`} skill={selected as 'reading' | 'listening' | 'writing' | 'speaking'} id={startPracticeId} hasActiveMembership={hasActiveMembership} membershipPending={membershipPending} /> : <Tabs.Root className="relative" value={selected} onValueChange={value => setParams(previous => {
        const next = new URLSearchParams(previous);
        next.set('bolum', value);
        return next;
      })}>
        <Tabs.List className="lesson-category-tabs" aria-label="Pratik bölümleri">
          {bolumler.map(item => <Tabs.Trigger key={item.category} value={item.category} className="lesson-category-tab">{item.baslik}</Tabs.Trigger>)}
        </Tabs.List>
        {bolumler.filter(bolum => bolum.category === selected ||
          visited.ownerId === user?.id && visited.categories.includes(bolum.category)).map((bolum) => {
          const isReady = bolum.hazir && Boolean(bolum.yol);
          const Ikon = bolum.ikon;

          return (
            <Tabs.Content key={`${user?.id ?? 'guest'}:${bolum.category}`} value={bolum.category} forceMount hidden={selected !== bolum.category}
              className="mt-4 data-[state=inactive]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tm-focus)]">
            {bolum.category === 'reading' ? (
              <ReadingPracticeList
                embedded
                inlineToolbar
                workspaceMode={workspaceMode}
                active={selected === bolum.category}
                hasActiveMembership={hasActiveMembership}
                membershipPending={membershipPending}
                onStartIntentHandled={() => setParams(previous => {
                  const next = new URLSearchParams(previous);
                  next.delete('start');
                  return next;
                }, { replace: true })}
              />
            ) : bolum.category === 'listening' ? (
              <PracticeList domain="LISTENING" active={selected === bolum.category} hasActiveMembership={hasActiveMembership} membershipPending={membershipPending} />
            ) : bolum.category === 'writing' ? (
              <PracticeList domain="WRITING" active={selected === bolum.category} hasActiveMembership={hasActiveMembership} membershipPending={membershipPending} />
            ) : bolum.category === 'speaking' ? (
              <PracticeList domain="SPEAKING" active={selected === bolum.category} hasActiveMembership={hasActiveMembership} membershipPending={membershipPending} />
            ) : !isReady ? <p className="py-8 text-sm text-[var(--tm-text-secondary)]">Hazırlanıyor</p> :
            <button
              key={bolum.baslik}
              type="button"
              disabled={!isReady}
              onClick={() =>
                isReady &&
                navigate(
                  bolum.yol === "/pratik/okuma" ? `${basePath}/okuma` : bolum.yol,
                )
              }
              className={`group block w-full rounded-lg border border-[var(--tm-border-subtle)] bg-white text-left transition-colors ${
                isReady
                  ? "p-5 sm:p-6 cursor-pointer hover:border-[var(--tm-border-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tm-focus)]"
                  : "px-5 py-4 cursor-default"
              }`}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span style={isReady ? categoryStyle(bolum.category) : undefined} className={`flex shrink-0 items-center justify-center rounded-lg ${isReady ? 'h-10 w-10' : 'h-8 w-8 text-[var(--tm-text-tertiary)]'}`}>
                      <Ikon className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <h2 className={`text-[16px] font-semibold ${isReady ? 'text-[var(--tm-text-primary)]' : 'text-[var(--tm-text-secondary)]'}`}>
                      {bolum.baslik}
                    </h2>
                  </div>
                  {!isReady && <span className="shrink-0 text-xs text-[var(--tm-text-secondary)]">Yakında</span>}
                </div>

                {isReady && <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--tm-text-secondary)]">
                  {bolum.aciklama}
                </p>}

                {isReady && <div className="mt-5 flex items-center justify-between text-sm font-medium text-[var(--tm-text-primary)]">
                  <span className={isReady ? "" : "opacity-60"}>
                    {isReady
                      ? workspaceMode
                        ? "Pratik yap"
                        : "Pratikleri incele"
                      : "Hazırlanıyor"}
                  </span>
                  {isReady ? (
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  ) : null}
                </div>}
              </div>
            </button>}
            </Tabs.Content>
          );
        })}
      </Tabs.Root>}
    </StudentPageShell>
  );
}

function hasSavedPracticeFilter() {
  try {
    for (const key of ['reading-practice-filters:workspace', 'practice-filters:listening', 'practice-filters:writing', 'practice-filters:speaking']) {
      const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (saved && ((saved.level && saved.level !== 'all') || (saved.section && saved.section !== 'all') || saved.sort === 'oldest' || (saved.levelFilter && saved.levelFilter !== 'tum') || (saved.sectionFilter && saved.sectionFilter !== 'tum') || (saved.sortMode && saved.sortMode !== 'yeni'))) return true;
    }
  } catch { /* Optional preferences. */ }
  return false;
}
