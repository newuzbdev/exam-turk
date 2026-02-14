import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Calendar, Trophy, Target, ListChecks, Clock } from "lucide-react";
import { authService } from "@/services/auth.service";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import axiosPrivate from "@/config/api";

interface TestResult {
  id: string;
  userId: string;
  completedAt: string | null;
  createdAt: string;
  isCompleted: boolean;
  listeningResultId: string | null;
  listeningScore: number | null;
  overallCoin: number;
  overallScore: number;
  readingResultId: string | null;
  readingScore: number | null;
  speakingResultId: string | null;
  speakingScore: number | null;
  startedAt: string;
  status: string;
  updatedAt: string;
  writingResultId: string | null;
  writingScore: number | null;
}

const getCefrLevel = (score: number | null | undefined): string => {
  if (score == null) return "-";
  if (score >= 65) return "C1";
  if (score >= 51) return "B2";
  if (score >= 38) return "B1";
  return "B1 altı";
};

const getSelectedTests = (test: TestResult) => {
  const selectedTests = [];
  if (test.readingResultId) selectedTests.push("Okuma");
  if (test.listeningResultId) selectedTests.push("Dinleme");
  if (test.writingResultId) selectedTests.push("Yazma");
  if (test.speakingResultId) selectedTests.push("Konuşma");
  return selectedTests.join(", ");
};

const getScoreValue = (test: TestResult) => {
  const score = test.overallScore as unknown as number;
  return typeof score === "number" ? score : Number(score) || 0;
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; userName: string; avatarUrl: string }>({
    name: "",
    userName: "",
    avatarUrl: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statsResults, setStatsResults] = useState<TestResult[]>([]);
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const LIMIT = 10;

  const getAvatarUrl = () => {
    if (!user) return null;
    const avatar = user.avatarUrl || user.avatar;
    if (!avatar) return null;
    return avatar.startsWith("http") ? avatar : `https://api.turkishmock.uz/${avatar}`;
  };

  const getUserInitials = (fullName?: string) => {
    const value = String(fullName || "").trim();
    if (!value) return "U";
    const parts = value.split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user data
        const userData = await authService.getCurrentUser();
        if (userData) {
          setUser({
            ...userData,
            joinDate: userData.createdAt
              ? new Date(userData.createdAt).toLocaleDateString("tr-TR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Bilinmiyor",
          });
          setForm({
            name: userData.name || "",
            userName: userData.username || userData.userName || "",
            avatarUrl: userData.avatarUrl || userData.avatar || "",
          });
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
        navigate("/login", { replace: true, state: { redirectTo: "/profile" } });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchResults = async (page: number) => {
    try {
      const response = await axiosPrivate.get(`/api/overal-test-result/get-users?page=${page}&limit=${LIMIT}`);
      setResults(response.data.data || []);
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error fetching results:", error);
    }
  };

  useEffect(() => {
    fetchResults(currentPage);
  }, [currentPage]);

  useEffect(() => {
    const fetchAllResultsForStats = async () => {
      try {
        const first = await axiosPrivate.get(`/api/overal-test-result/get-users?page=1&limit=50`);
        const firstData = first?.data?.data || [];
        const totalCount = first?.data?.total || firstData.length;
        const limit = first?.data?.limit || 50;
        const totalPages = Math.ceil(totalCount / limit);

        let all: TestResult[] = [...firstData];
        if (totalPages > 1) {
          for (let page = 2; page <= totalPages; page++) {
            const res = await axiosPrivate.get(`/api/overal-test-result/get-users?page=${page}&limit=${limit}`);
            const pageData = res?.data?.data || [];
            all = all.concat(pageData);
          }
        }

        setStatsResults(all);
      } catch (error) {
        console.error("Error fetching stats results:", error);
        setStatsResults([]);
      } finally {
      }
    };

    fetchAllResultsForStats();
  }, []);

  const getResultDate = (r: TestResult) => new Date(r.completedAt || r.createdAt || r.startedAt).getTime();

  const baseResults = statsResults.length ? statsResults : results;
  const completedTests = baseResults.filter((r) => r.isCompleted || !!r.completedAt || (r.overallScore || 0) > 0);
  const statsSource = completedTests.length ? completedTests : baseResults;

  const sortedByDate = [...statsSource].sort((a, b) => getResultDate(b) - getResultDate(a));
  const totalTests = baseResults.length;
  const highestScore = statsSource.length > 0 ? Math.max(...statsSource.map((r) => r.overallScore || 0)) : 0;
  const latestScore = sortedByDate[0]?.overallScore || 0;
  const latestTestDate = sortedByDate[0]?.completedAt
    ? new Date(sortedByDate[0].completedAt).toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : (sortedByDate[0] ? new Date(sortedByDate[0].createdAt || sortedByDate[0].startedAt).toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }) : "Henüz test tamamlanmadı");

  const listSource = statsResults.length ? statsResults : results;
  const sortedResults = [...listSource].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortBy === "score") return (getScoreValue(a) - getScoreValue(b)) * dir;
    return (getResultDate(a) - getResultDate(b)) * dir;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-200 border-t-red-600"></div>
          <span className="text-gray-600 font-medium">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Profile Card */}
          <div className="lg:col-span-4">
            <Card className="bg-white rounded-2xl shadow-sm border border-gray-200 sticky top-8">
              <CardContent className="p-6">
                {/* Avatar */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div
                    className="cursor-pointer hover:opacity-80 transition-opacity mb-4"
                    onClick={() => setImagePreviewOpen(true)}
                  >
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={getAvatarUrl() || undefined} alt={user?.name} />
                      <AvatarFallback className="text-2xl font-semibold text-gray-700 bg-gray-100">
                        {getUserInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{user?.name}</h2>
                  <p className="text-sm text-gray-600">{user?.email || user?.username}</p>
                </div>

                {/* Stats Grid */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Katılım Tarihi</p>
                      <p className="text-sm font-semibold text-gray-900">{user?.joinDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center">
                      <ListChecks className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Toplam Test</p>
                      <p className="text-sm font-semibold text-gray-900">{totalTests > 0 ? totalTests : "-"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">En Yüksek Puan</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {highestScore > 0 ? `${highestScore} / ${getCefrLevel(highestScore)}` : "-"}
                      </p>
                    </div>
                  </div>

                </div>
                {/* Quick Stats (Moved Left) */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center">
                      <Target className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">En Son Puan</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {latestScore > 0 ? `${latestScore} / ${getCefrLevel(latestScore)}` : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">En Son Test</p>
                      <p className="text-sm font-semibold text-gray-900">{latestTestDate}</p>
                    </div>
                  </div>
                </div>

                {/* Settings Button */}
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700">
                      <Settings className="w-4 h-4 mr-2" />
                      Profili Düzenle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-gray-200 shadow-xl">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900">Profili Düzenle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Ad</label>
                        <Input
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="border-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Kullanıcı adı</label>
                        <Input
                          value={form.userName}
                          onChange={(e) => setForm({ ...form, userName: e.target.value })}
                          className="border-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Profil Fotoğrafı</label>
                        <div className="space-y-3">
                          {avatarPreview || form.avatarUrl ? (
                            <div className="flex justify-center">
                              <img
                                src={
                                  avatarPreview ||
                                  (form.avatarUrl?.startsWith("http")
                                    ? form.avatarUrl
                                    : `https://api.turkishmock.uz/${form.avatarUrl}`)
                                }
                                alt="Önizleme"
                                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                              />
                            </div>
                          ) : null}
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setAvatarFile(file);
                              if (file) {
                                const url = URL.createObjectURL(file);
                                setAvatarPreview(url);
                              } else {
                                setAvatarPreview("");
                              }
                            }}
                            className="border-gray-300"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="outline" onClick={() => setEditOpen(false)} className="border-gray-300">
                          İptal
                        </Button>
                        <Button
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={async () => {
                            if (!user?.id) return;
                            try {
                              const updated = await authService.updateUser(
                                user.id,
                                { name: form.name, userName: form.userName, avatarUrl: form.avatarUrl },
                                { avatarFile }
                              );
                              setUser({
                                ...user,
                                ...updated,
                                username: updated.userName || updated.username,
                                avatarUrl: updated.avatarUrl || updated.avatar,
                              });
                              setEditOpen(false);
                              setAvatarFile(null);
                              setAvatarPreview("");
                            } catch {}
                          }}
                        >
                          Kaydet
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Right Content - Statistics & Test History */}
          <div className="lg:col-span-8">
            {/* Test History */}
            <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Test Geçmişi</h3>
                    <p className="text-sm text-gray-500">Sonuçları tarih veya puana göre sırala</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-full border border-gray-200 bg-gray-50 p-1">
                      {[
                        { id: "date", label: "Tarih" },
                        { id: "score", label: "Puan" },
                      ].map((item) => (
                        <Button
                          key={item.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSortBy(item.id as any)}
                          className={`h-8 rounded-full px-3 text-xs ${
                            sortBy === item.id
                              ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                      className="h-8 rounded-full border border-gray-200 bg-white px-3 text-gray-700 hover:bg-gray-50"
                    >
                      {sortDir === "asc" ? "Artan" : "Azalan"}
                    </Button>
                  </div>
                </div>

                {sortedResults.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-4">—</div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Henüz test sonucu yok</h4>
                    <p className="text-gray-600 mb-6">Sınavınızı tamamladığınızda sonuçlar burada görünecek.</p>
                    <Button onClick={() => navigate("/test")} className="bg-red-600 hover:bg-red-700 text-white">
                      Test Başlat
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-[60vh] overflow-y-auto pr-1 rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="hidden sm:grid grid-cols-[1.2fr_1.2fr_150px_90px] gap-4 px-5 py-3 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      <span>Tarih</span>
                      <span>Testler</span>
                      <span>Puan / Seviye</span>
                      <span className="text-right">İşlem</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {sortedResults.map((result) => (
                        <div
                          key={result.id}
                          className="group px-4 sm:px-5 py-3 transition-colors hover:bg-gray-50/70"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.2fr_150px_90px] gap-3 sm:gap-4 items-center">
                            <div>
                              <p className="text-xs text-gray-500 sm:hidden mb-0.5">Tarih</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {new Date(result.completedAt || result.startedAt).toLocaleDateString("tr-TR")}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500 sm:hidden mb-0.5">Testler</p>
                              <p className="text-sm text-gray-800">{getSelectedTests(result)}</p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500 sm:hidden mb-0.5">Puan / Seviye</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {(result.overallScore || 0) > 0
                                  ? `${result.overallScore} / ${getCefrLevel(result.overallScore)}`
                                  : "-"}
                              </p>
                            </div>

                            <div className="sm:text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/overall-results/${result.id}`)}
                                className="border-gray-300 text-gray-700"
                              >
                                Detay
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 bg-black/95 border-none sm:rounded-lg">
          <div className="relative w-full flex items-center justify-center min-h-[70vh] p-4 sm:p-8">
            {getAvatarUrl() ? (
              <img
                src={getAvatarUrl() || undefined}
                alt={user?.name}
                className="max-w-full max-h-[80vh] w-auto h-auto rounded-lg object-contain shadow-2xl"
              />
            ) : (
              <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center shadow-2xl">
                <span className="text-6xl sm:text-8xl font-semibold text-white">
                  {getUserInitials(user?.name)}
                </span>
              </div>
            )}
            <button
              onClick={() => setImagePreviewOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-white/20 z-10"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}





