import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  Coins,
  ListChecks,
  Loader2,
  ReceiptText,
  Save,
  User,
} from "lucide-react";
import axiosPrivate from "@/config/api";
import { authService } from "@/services/auth.service";
import { paymeService } from "@/services/payme.service";

type ProfileSection = "profile" | "exams" | "transactions";

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

interface ProfileStatsPayload {
  totalTests?: number;
  highestScore?: number;
  latestScore?: number;
  latestTestDate?: string | null;
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
  return "B1 alti";
};

const getSelectedTests = (test: TestResult) => {
  const selected: string[] = [];
  if (test.readingResultId) selected.push("Okuma");
  if (test.listeningResultId) selected.push("Dinleme");
  if (test.writingResultId) selected.push("Yazma");
  if (test.speakingResultId) selected.push("Konusma");
  return selected;
};

const TEST_INITIALS: Record<string, string> = {
  Okuma: "O",
  Dinleme: "D",
  Yazma: "Y",
  Konusma: "K",
};

const compactTestsLabel = (tests: string[]) => {
  if (!tests.length) return "Sinav";
  return tests
    .map((test) => TEST_INITIALS[test] || test.trim().charAt(0).toUpperCase())
    .filter(Boolean)
    .join(" + ");
};

export default function ProfilePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeSection, setActiveSection] = useState<ProfileSection>("profile");

  const [user, setUser] = useState<any>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [profileStats, setProfileStats] = useState<ProfileStatsPayload | null>(null);

  const [form, setForm] = useState<{ name: string; userName: string; avatarUrl: string }>({
    name: "",
    userName: "",
    avatarUrl: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarFileName, setAvatarFileName] = useState("");

  const [examSortBy, setExamSortBy] = useState<"date" | "score">("date");
  const [examSortDir, setExamSortDir] = useState<"desc" | "asc">("desc");
  const [txSortBy, setTxSortBy] = useState<"date" | "amount">("date");
  const [txSortDir, setTxSortDir] = useState<"desc" | "asc">("desc");
  const [coinUnitPrice, setCoinUnitPrice] = useState(1000);
  const [topupTransactions, setTopupTransactions] = useState<UnifiedTransactionRow[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await authService.getCurrentUser();
        if (!userData) {
          navigate("/login", { replace: true, state: { redirectTo: "/profile" } });
          return;
        }

        setUser(userData);
        setForm({
          name: String(userData.name ?? userData.userName ?? ""),
          userName: String(userData.username ?? userData.userName ?? ""),
          avatarUrl: String(userData.avatarUrl ?? userData.avatar ?? ""),
        });

        const [statsResponse, firstPageResponse] = await Promise.all([
          axiosPrivate.get("/api/overal-test-result/profile-stats").catch(() => null),
          axiosPrivate.get("/api/overal-test-result/get-users?page=1&limit=50").catch(() => null),
        ]);

        const statsRaw =
          statsResponse?.data?.data || statsResponse?.data || ({} as ProfileStatsPayload);
        setProfileStats({
          totalTests: Number(statsRaw.totalTests ?? 0),
          highestScore: Number(statsRaw.highestScore ?? 0),
          latestScore: Number(statsRaw.latestScore ?? 0),
          latestTestDate:
            typeof statsRaw.latestTestDate === "string" && statsRaw.latestTestDate.trim()
              ? statsRaw.latestTestDate
              : null,
        });

        const firstPageData = firstPageResponse?.data?.data || [];
        const total = Number(firstPageResponse?.data?.total || firstPageData.length);
        const limit = Number(firstPageResponse?.data?.limit || 50) || 50;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        let mergedResults: TestResult[] = Array.isArray(firstPageData) ? firstPageData : [];
        if (totalPages > 1) {
          for (let page = 2; page <= totalPages; page += 1) {
            const pageResponse = await axiosPrivate.get(
              `/api/overal-test-result/get-users?page=${page}&limit=${limit}`,
            );
            const pageData = pageResponse?.data?.data || [];
            if (Array.isArray(pageData)) mergedResults = mergedResults.concat(pageData);
          }
        }

        setResults(mergedResults);
      } catch (error) {
        console.error("Error fetching profile page:", error);
        navigate("/login", { replace: true, state: { redirectTo: "/profile" } });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  useEffect(() => {
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
                  paidFor: "Kredi Alimi",
                  type: "Kredi Yukleme",
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

  const totalTests = Number(profileStats?.totalTests ?? completedResults.length ?? 0);
  const highestScore =
    Number(profileStats?.highestScore ?? 0) > 0
      ? Number(profileStats?.highestScore)
      : completedResults.length
        ? Math.max(...completedResults.map((item) => Number(item.overallScore || 0)))
        : 0;

  const latestByDate = useMemo(() => {
    if (!completedResults.length) return null;
    return [...completedResults].sort((a, b) => getResultTimestamp(b) - getResultTimestamp(a))[0];
  }, [completedResults]);

  const latestScore =
    Number(profileStats?.latestScore ?? 0) > 0
      ? Number(profileStats?.latestScore)
      : Number(latestByDate?.overallScore || 0);
  const latestTestDate = profileStats?.latestTestDate
    ? formatDate(profileStats.latestTestDate)
    : latestByDate
      ? formatDate(latestByDate.completedAt || latestByDate.createdAt || latestByDate.startedAt)
      : "-";

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
          type: "Sinav Ucreti",
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const saveProfile = async () => {
    if (!user?.id) return;
    try {
      setSavingProfile(true);
      const updated = await authService.updateUser(
        user.id,
        {
          name: form.name,
          userName: form.userName,
          avatarUrl: form.avatarUrl,
        },
        { avatarFile },
      );
      setUser((prev: any) => ({
        ...(prev || {}),
        ...updated,
        username: updated.userName || updated.username || prev?.username,
        avatarUrl: updated.avatarUrl || updated.avatar || prev?.avatarUrl,
      }));
      setAvatarFile(null);
      setAvatarFileName("");
    } catch {
    } finally {
      setSavingProfile(false);
    }
  };

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
      <div className="min-h-screen bg-[#f6f7f9] flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-gray-500" />
      </div>
    );
  }

  const sections: Array<{ key: ProfileSection; label: string; icon: React.ComponentType<any> }> = [
    { key: "profile", label: "Profil Bilgileri", icon: User },
    { key: "exams", label: "Sinav Sonuclari", icon: BookOpenCheck },
    { key: "transactions", label: "Harcamalar", icon: ReceiptText },
  ];

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside>
            <Card className="border border-gray-200 bg-white shadow-sm">
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
          </aside>

          <section>
            {activeSection === "profile" && (
              <div className="space-y-4">
                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle>Profil Bilgileri</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="max-w-xl space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Kullanici Adi</label>
                        <Input
                          value={form.userName}
                          onChange={(e) => setForm((prev) => ({ ...prev, userName: e.target.value }))}
                          placeholder="Kullanici Adi"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Profil Resmi</label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setAvatarFile(file);
                            setAvatarFileName(file?.name || "");
                          }}
                        />
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Dosya Sec
                          </Button>
                          {avatarFileName ? (
                            <span className="text-sm text-gray-600">{avatarFileName}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        className="bg-red-600 text-white hover:bg-red-700"
                        disabled={savingProfile}
                        onClick={saveProfile}
                      >
                        {savingProfile ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Kaydediliyor
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Kaydet
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle>Istatistikler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-xs text-gray-500">Toplam Test</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">{totalTests}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-xs text-gray-500">Katilim Tarihi</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">{latestTestDate}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-xs text-gray-500">En Yuksek Puan</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {highestScore > 0 ? `${highestScore} / ${getCefrLevel(highestScore)}` : "-"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-xs text-gray-500">En Son Puan</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {latestScore > 0 ? `${latestScore} / ${getCefrLevel(latestScore)}` : "-"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === "exams" && (
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Sinav Sonuclari</CardTitle>
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
                      <p className="text-sm text-gray-600">Henuz tamamlanmis sinav yok.</p>
                      <Button className="mt-4 bg-red-600 hover:bg-red-700" onClick={() => navigate("/test")}>
                        Teste Git
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sortedExamResults.map((result) => {
                        const tests = getSelectedTests(result);
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
                                    {tests.length} bolum
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
                                    {Number(result.overallScore || 0) > 0
                                      ? `${result.overallScore} / ${getCefrLevel(result.overallScore)}`
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

            {activeSection === "transactions" && (
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>Harcamalar</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {sortedSpendingRows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-600">
                      Henuz harcama kaydi yok.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200">
                      <table className="w-full table-fixed">
                        <colgroup>
                          <col className="w-[8%]" />
                          <col className="w-[18.4%]" />
                          <col className="w-[18.4%]" />
                          <col className="w-[18.4%]" />
                          <col className="w-[18.4%]" />
                          <col className="w-[18.4%]" />
                        </colgroup>
                        <thead className="bg-gray-50">
                          <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 font-semibold">#</th>
                            <th className="px-4 py-3 font-semibold">
                              <button
                                type="button"
                                onClick={() => toggleTxSort("date")}
                                className="inline-flex items-center gap-1 transition hover:text-gray-900"
                              >
                                ISLEM TARIHI {txSortBy === "date" ? (txSortDir === "asc" ? "↑" : "↓") : ""}
                              </button>
                            </th>
                            <th className="px-4 py-3 font-semibold">ODEME YONTEMI</th>
                            <th className="px-4 py-3 font-semibold">NE ICIN</th>
                            <th className="px-4 py-3 font-semibold">ISLEM TURU</th>
                            <th className="px-4 py-3 text-right font-semibold">
                              <button
                                type="button"
                                onClick={() => toggleTxSort("amount")}
                                className="inline-flex items-center gap-1 transition hover:text-gray-900"
                              >
                                TUTAR {txSortBy === "amount" ? (txSortDir === "asc" ? "↑" : "↓") : ""}
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {sortedSpendingRows.map((row, index) => (
                            <tr key={row.id} className="text-sm text-gray-700">
                              <td className="px-4 py-3 font-medium text-gray-500">{index + 1}</td>
                              <td className="px-4 py-3">{formatDateTime(row.date)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium">
                                  {row.source}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700" title={row.paidFor}>
                                  {row.paidFor}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">{row.type}</td>
                              <td className="px-4 py-3 text-right">
                                {row.direction === "credit_purchase" ? (
                                  <>
                                    <p className="font-semibold text-red-600">-{formatUzs(row.amountUzs)}</p>
                                    <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                      +{row.amountCredits} <Coins className="h-3.5 w-3.5" />
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="inline-flex items-center gap-1 font-semibold text-red-600">
                                      -{row.amountCredits} <Coins className="h-4 w-4" />
                                    </p>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
