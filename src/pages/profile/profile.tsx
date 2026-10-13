import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePageDataQuery, pageDataKey } from "@/hooks/use-page-data-query";
import { useDashboardResults } from "@/pages/dashboard/dashboard-results-api";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  Coins,
  ListChecks,
  Loader2,
  ReceiptText,
  User,
} from "lucide-react";
import axiosPrivate from "@/config/api";
import { isSubscriptionBillingEnabled } from "@/config/billing";
import { authService } from "@/services/auth.service";
import { paymeService } from "@/services/payme.service";
import { SubscriptionStatusCard } from "./subscription-status-card";
import PublicResultSharingSetting from "@/components/auth/public-result-sharing-setting";
import { ProfileDetails, type ProfileUser } from "./profile-details";
import PurchasedPackages from "./purchased-packages";

type ProfileSection = "profile" | "exams" | "transactions";

type ProfilePageProps = {
  embedded?: boolean;
  initialSection?: ProfileSection;
};

interface TestResult {
  id: string;
  completedAt: string | null;
  createdAt: string;
  startedAt: string;
  isCompleted: boolean;
  listeningResultId: string | null;
  readingResultId: string | null;
  writingResultId: string | null;
  speakingResultId: string | null;
  overallScore: number;
  overallCoin: number;
}

interface UnifiedTransactionRow {
  id: string;
  date: string;
  source: string;
  paidFor: string;
  type: string;
  amountCredits: number;
  amountUzs: number;
  direction: "credit_purchase" | "exam_fee";
}

const getResultTimestamp = (result: TestResult) =>
  new Date(result.completedAt || result.createdAt || result.startedAt).getTime();

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatUzs = (value: number) =>
  `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)} UZS`;

const getCefrLevel = (score: number | null | undefined): string => {
  if (score == null || score <= 0) return "-";
  if (score >= 65) return "C1";
  if (score >= 51) return "B2";
  if (score >= 38) return "B1";
  return "B1 altı";
};
const wholeScore = (score: number | null | undefined): number =>
  Math.round(Number(score) || 0);

const getSelectedTests = (test: TestResult) => {
  const selected: string[] = [];
  if (test.readingResultId) selected.push("Okuma");
  if (test.listeningResultId) selected.push("Dinleme");
  if (test.writingResultId) selected.push("Yazma");
  if (test.speakingResultId) selected.push("Konuşma");
  return selected;
};

const TEST_INITIALS: Record<string, string> = {
  Okuma: "O",
  Dinleme: "D",
  Yazma: "Y",
  Konuşma: "K",
};

const compactTestsLabel = (tests: string[]) => {
  if (!tests.length) return "Sınav";
  return tests
    .map((test) => TEST_INITIALS[test] || test.trim().charAt(0).toUpperCase())
    .filter(Boolean)
    .join(" + ");
};

export default function ProfilePage({
  embedded = false,
  initialSection = "profile",
}: ProfilePageProps) {
  const navigate = useNavigate();

  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] =
    useState<ProfileSection>(initialSection);

  const profile = usePageDataQuery({
    queryKey: ['profile'],
    queryFn: authService.getCurrentUser,
    enabled: isAuthenticated && Boolean(authUser?.id),
    initialData: authUser as Awaited<ReturnType<typeof authService.getCurrentUser>>,
    // Auth supplies the immediate display, then one fresh profile read. Quick
    // route returns reuse it rather than issuing another signed avatar URL.
    initialDataUpdatedAt: 0,
  });
  const user = (profile.data ?? authUser) as (ProfileUser & Record<string, unknown>) | null;
  const history = useDashboardResults(activeSection !== 'profile');
  const results = useMemo(() => (history.data ?? []) as TestResult[], [history.data]);
  const loading = (!user && profile.isPending) || (activeSection === 'exams' && history.isPending);
  const [examSortBy, setExamSortBy] = useState<"date" | "score">("date");
  const [examSortDir, setExamSortDir] = useState<"desc" | "asc">("desc");
  const [txSortBy, setTxSortBy] = useState<"date" | "amount">("date");
  const [txSortDir, setTxSortDir] = useState<"desc" | "asc">("desc");
  const [coinUnitPrice, setCoinUnitPrice] = useState(1000);
  const [topupTransactions, setTopupTransactions] = useState<UnifiedTransactionRow[]>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/login', {
      replace: true,
      state: { redirectTo: initialSection === 'exams' ? '/app/sonuclar' : embedded ? '/app/profil' : '/profile' },
    });
  }, [authLoading, isAuthenticated, embedded, initialSection, navigate]);

  useEffect(() => {
    if (isSubscriptionBillingEnabled) return;
    let mounted = true;
    (async () => {
      try {
        const products = await paymeService.getAllProducts();
        const firstPrice = Number(products?.[0]?.price || 0);
        if (mounted && Number.isFinite(firstPrice) && firstPrice > 0) {
          setCoinUnitPrice(firstPrice);
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isSubscriptionBillingEnabled) return;
    let mounted = true;
    (async () => {
      try {
        const candidates = [
          "/api/product/transaction",
          "/api/product/transactions/me",
          "/api/product/transactions",
          "/api/product/history",
          "/api/payme",
          "/api/payme/transactions",
          "/api/payme/history",
          "/api/payment/transactions",
        ];

        for (const endpoint of candidates) {
          try {
            const response = await axiosPrivate.get(endpoint);
            const payload = response?.data?.data ?? response?.data;
            const list = Array.isArray(payload)
              ? payload
              : Array.isArray(payload?.transactions)
                ? payload.transactions
                : Array.isArray(payload?.items)
                  ? payload.items
                  : [];
            if (!list.length) continue;

            const mapped: UnifiedTransactionRow[] = list
              .map((item: any, index: number) => {
                const creditsRaw =
                  Number(item?.amount ?? item?.coin ?? item?.units ?? item?.quantity ?? 0) || 0;
                const totalPriceRaw =
                  Number(item?.totalPrice ?? item?.amountUzs ?? item?.sum ?? item?.priceTotal ?? 0) || 0;
                const amountUzs = totalPriceRaw > 0 ? totalPriceRaw : Math.max(0, creditsRaw * coinUnitPrice);
                const date =
                  String(
                    item?.createdAt ||
                      item?.date ||
                      item?.updatedAt ||
                      item?.paidAt ||
                      new Date().toISOString(),
                  );

                return {
                  id: String(item?.id || item?.transactionId || `topup-${index}`),
                  date,
                  source: String(item?.source || item?.provider || item?.paymentMethod || "Payme"),
                  paidFor: "Kredi Alımı",
                  type: "Kredi Yükleme",
                  amountCredits: Math.max(0, creditsRaw),
                  amountUzs: Math.max(0, amountUzs),
                  direction: "credit_purchase",
                };
              })
              .filter((row: UnifiedTransactionRow) => row.amountCredits > 0 || row.amountUzs > 0);

            if (mapped.length) {
              if (mounted) setTopupTransactions(mapped);
              return;
            }
          } catch {}
        }
      } catch {}
    })();

    return () => {
      mounted = false;
    };
  }, [coinUnitPrice]);

  const completedResults = useMemo(
    () =>
      results.filter(
        (result) => result.isCompleted || !!result.completedAt || Number(result.overallScore || 0) > 0,
      ),
    [results],
  );

  const sortedExamResults = useMemo(() => {
    const list = [...completedResults];
    list.sort((a, b) => {
      const direction = examSortDir === "asc" ? 1 : -1;
      if (examSortBy === "score") {
        return (Number(a.overallScore || 0) - Number(b.overallScore || 0)) * direction;
      }
      return (getResultTimestamp(a) - getResultTimestamp(b)) * direction;
    });
    return list;
  }, [completedResults, examSortBy, examSortDir]);

  const examFeeRows = useMemo(
    () =>
      completedResults
        .filter((result) => Number(result.overallCoin || 0) > 0)
        .map((result): UnifiedTransactionRow => ({
          id: result.id,
          date: result.completedAt || result.createdAt || result.startedAt,
          amountCredits: Number(result.overallCoin || 0),
          amountUzs: Number(result.overallCoin || 0) * coinUnitPrice,
          source: "Kredi Bakiyesi",
          paidFor: compactTestsLabel(getSelectedTests(result)),
          type: "Sınav Ücreti",
          direction: "exam_fee",
        })),
    [completedResults, coinUnitPrice],
  );

  const unifiedTransactions = useMemo(
    () => [...topupTransactions, ...examFeeRows],
    [topupTransactions, examFeeRows],
  );

  const sortedSpendingRows = useMemo(() => {
    const list = [...unifiedTransactions];
    list.sort((a, b) => {
      const direction = txSortDir === "asc" ? 1 : -1;
      if (txSortBy === "amount") return (a.amountUzs - b.amountUzs) * direction;
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * direction;
    });
    return list;
  }, [unifiedTransactions, txSortBy, txSortDir]);

  const toggleExamSort = (field: "date" | "score") => {
    if (examSortBy === field) {
      setExamSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setExamSortBy(field);
    setExamSortDir("desc");
  };

  const toggleTxSort = (field: "date" | "amount") => {
    if (txSortBy === field) {
      setTxSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setTxSortBy(field);
    setTxSortDir("desc");
  };

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center ${
          embedded ? "min-h-[320px] bg-transparent" : "min-h-screen bg-[var(--tm-bg-app)]"
        }`}
      >
        <Loader2 className="h-7 w-7 animate-spin text-gray-500" />
      </div>
    );
  }

  const sections: Array<{ key: ProfileSection; label: string; icon: React.ComponentType<any> }> = [
    { key: "profile", label: "Profil Bilgileri", icon: User },
    { key: "exams", label: "Sınav Sonuçları", icon: BookOpenCheck },
    ...(!isSubscriptionBillingEnabled
      ? [{ key: "transactions" as const, label: "Harcamalar", icon: ReceiptText }]
      : []),
  ];
  const panelClassName = embedded
    ? "border border-[var(--tm-border-subtle)] bg-white shadow-none"
    : "border border-gray-200 bg-white shadow-sm";

  return (
    <div className={embedded ? "min-h-screen bg-transparent" : "min-h-screen bg-[var(--tm-bg-app)]"}>
      <div
        className={`mx-auto px-4 py-8 sm:px-6 lg:px-8 ${
          embedded ? "max-w-6xl" : "max-w-[1400px]"
        }`}
      >
        {embedded ? (
          <header className="mb-6 border-b border-[var(--tm-border-subtle)] pb-6">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--tm-text-primary)]">
              {initialSection === "exams" ? "Sınav sonuçları" : "Profil"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tm-text-secondary)]">
              {initialSection === "exams"
                ? "Tamamladığınız sınavları ve puanlarınızı burada inceleyin."
                : "Hesap bilgilerinizi buradan düzenleyin."}
            </p>
          </header>
        ) : null}
        <div className={embedded ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"}>
          {!embedded ? <aside>
            <Card className={panelClassName}>
              <CardContent className="p-3">
                <div className="space-y-1">
                  {sections.map((item) => {
                    const Icon = item.icon;
                    const active = activeSection === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setActiveSection(item.key)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          active
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </aside> : null}

          <section>
            {activeSection === "profile" && (
              <div className="space-y-4">
                {user ? <ProfileDetails key={`profile-${user.id}`} user={user} className={panelClassName}
                  onSaved={(updated) => {
                    const key = pageDataKey(['profile'], authUser?.id);
                    if (!queryClient.getQueryState(key)) return;
                    // A slow pre-save GET must not overwrite the accepted edit.
                    void queryClient.cancelQueries({ queryKey: key, exact: true });
                    queryClient.setQueryData(key, { ...user, ...updated });
                  }} /> : null}
                {isSubscriptionBillingEnabled && <><SubscriptionStatusCard /><PurchasedPackages /></>}
                <PublicResultSharingSetting key={user?.id} />
              </div>
            )}

            {activeSection === "exams" && (
              <Card className={panelClassName}>
                <CardHeader>
                  <CardTitle>Sınav Sonuçları</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex items-center gap-5 border-b border-gray-100 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <button
                      type="button"
                      onClick={() => toggleExamSort("date")}
                      className="transition hover:text-gray-900"
                    >
                      Tarih {examSortBy === "date" ? (examSortDir === "asc" ? "↑" : "↓") : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExamSort("score")}
                      className="transition hover:text-gray-900"
                    >
                      Puan {examSortBy === "score" ? (examSortDir === "asc" ? "↑" : "↓") : ""}
                    </button>
                  </div>
                  {sortedExamResults.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 px-4 py-12 text-center">
                      <p className="text-sm text-gray-600">Henüz tamamlanmış sınav yok.</p>
                      <Button
                        variant="outline"
                        className="mt-4 border-gray-200 bg-white text-gray-900 shadow-none hover:bg-gray-50 hover:text-gray-900"
                        onClick={() => navigate(embedded ? "/app/test" : "/test")}
                      >
                        Mock Test
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sortedExamResults.map((result) => {
                        const tests = getSelectedTests(result);
                        const roundedOverall = wholeScore(result.overallScore);
                        return (
                          <div
                            key={result.id}
                            className="rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-sm"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="border-gray-300 text-gray-600">
                                    <CalendarDays className="mr-1 h-3.5 w-3.5" />
                                    {formatDate(result.completedAt || result.createdAt || result.startedAt)}
                                  </Badge>
                                  <Badge variant="outline" className="border-gray-300 text-gray-600">
                                    <ListChecks className="mr-1 h-3.5 w-3.5" />
                                    {tests.length} bölüm
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {tests.map((name) => (
                                    <span
                                      key={`${result.id}-${name}`}
                                      className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                                    >
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-4 sm:justify-end">
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Skor</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {roundedOverall > 0
                                      ? `${roundedOverall} / ${getCefrLevel(roundedOverall)}`
                                      : "-"}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/overall-results/${result.id}`)}
                                >
                                  Detay
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!isSubscriptionBillingEnabled && activeSection === "transactions" && (
              <Card className={panelClassName}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>Harcamalar</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sortedSpendingRows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-600">
                      Henüz harcama kaydı yok.
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 md:hidden">
                        <Button
                          type="button"
                          variant={txSortBy === "date" ? "default" : "outline"}
                          size="sm"
                          className={txSortBy === "date" ? "bg-red-600 text-white hover:bg-red-700" : ""}
                          onClick={() => toggleTxSort("date")}
                        >
                          Tarih {txSortBy === "date" ? (txSortDir === "asc" ? "(ASC)" : "(DESC)") : ""}
                        </Button>
                        <Button
                          type="button"
                          variant={txSortBy === "amount" ? "default" : "outline"}
                          size="sm"
                          className={txSortBy === "amount" ? "bg-red-600 text-white hover:bg-red-700" : ""}
                          onClick={() => toggleTxSort("amount")}
                        >
                          Tutar {txSortBy === "amount" ? (txSortDir === "asc" ? "(ASC)" : "(DESC)") : ""}
                        </Button>
                      </div>

                      <div className="space-y-3 md:hidden">
                        {sortedSpendingRows.map((row, index) => (
                          <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs text-gray-500">#{index + 1}</p>
                                <p className="text-sm font-semibold text-gray-900">{formatDateTime(row.date)}</p>
                              </div>
                              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
                                {row.source}
                              </span>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-gray-500">Ne İçin</span>
                                <span className="max-w-[68%] break-words text-right font-medium text-gray-800">
                                  {row.paidFor}
                                </span>
                              </div>
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-gray-500">İşlem Türü</span>
                                <span className="max-w-[68%] break-words text-right font-medium text-gray-800">
                                  {row.type}
                                </span>
                              </div>
                              <div className="flex items-start justify-between gap-3 border-t border-gray-100 pt-2">
                                <span className="text-gray-500">Tutar</span>
                                <div className="text-right">
                                  {row.direction === "credit_purchase" ? (
                                    <>
                                      <p className="font-semibold text-red-600">-{formatUzs(row.amountUzs)}</p>
                                      <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                        +{row.amountCredits} <Coins className="h-3.5 w-3.5" />
                                      </p>
                                    </>
                                  ) : (
                                    <p className="inline-flex items-center gap-1 font-semibold text-red-600">
                                      -{row.amountCredits} <Coins className="h-4 w-4" />
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 md:block">
                        <table className="min-w-[860px] w-full table-auto">
                          <thead className="bg-gray-50">
                            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                              <th className="px-4 py-3 font-semibold">#</th>
                              <th className="px-4 py-3 font-semibold">
                                <button
                                  type="button"
                                  onClick={() => toggleTxSort("date")}
                                  className="inline-flex items-center gap-1 transition hover:text-gray-900"
                                >
                                  İŞLEM TARİHİ {txSortBy === "date" ? (txSortDir === "asc" ? "(ASC)" : "(DESC)") : ""}
                                </button>
                              </th>
                              <th className="px-4 py-3 font-semibold">ÖDEME YÖNTEMİ</th>
                              <th className="px-4 py-3 font-semibold">NE İÇİN</th>
                              <th className="px-4 py-3 font-semibold">İŞLEM TÜRÜ</th>
                              <th className="px-4 py-3 text-right font-semibold">
                                <button
                                  type="button"
                                  onClick={() => toggleTxSort("amount")}
                                  className="inline-flex items-center gap-1 transition hover:text-gray-900"
                                >
                                  TUTAR {txSortBy === "amount" ? (txSortDir === "asc" ? "(ASC)" : "(DESC)") : ""}
                                </button>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {sortedSpendingRows.map((row, index) => (
                              <tr key={row.id} className="text-sm text-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-500">{index + 1}</td>
                                <td className="whitespace-nowrap px-4 py-3">{formatDateTime(row.date)}</td>
                                <td className="whitespace-nowrap px-4 py-3">
                                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium">
                                    {row.source}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                                    title={row.paidFor}
                                  >
                                    {row.paidFor}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3">{row.type}</td>
                                <td className="px-4 py-3 text-right">
                                  {row.direction === "credit_purchase" ? (
                                    <>
                                      <p className="font-semibold text-red-600">-{formatUzs(row.amountUzs)}</p>
                                      <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                        +{row.amountCredits} <Coins className="h-3.5 w-3.5" />
                                      </p>
                                    </>
                                  ) : (
                                    <p className="inline-flex items-center gap-1 font-semibold text-red-600">
                                      -{row.amountCredits} <Coins className="h-4 w-4" />
                                    </p>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
