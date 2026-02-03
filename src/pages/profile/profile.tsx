import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Settings, Eye, Calendar, Trophy, TrendingUp, Target } from "lucide-react";
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
  if (score >= 90) return "C2";
  if (score >= 75) return "C1";
  if (score >= 60) return "B2";
  if (score >= 45) return "B1";
  if (score >= 30) return "A2";
  return "A1";
};

const getSelectedTests = (test: TestResult) => {
  const selectedTests = [];
  if (test.readingResultId) selectedTests.push("Okuma");
  if (test.listeningResultId) selectedTests.push("Dinleme");
  if (test.writingResultId) selectedTests.push("Yazma");
  if (test.speakingResultId) selectedTests.push("Konuşma");
  return selectedTests.join(", ");
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
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  const getAvatarUrl = () => {
    if (!user) return null;
    const avatar = user.avatarUrl || user.avatar;
    if (!avatar) return null;
    return avatar.startsWith("http") ? avatar : `https://api.turkishmock.uz/${avatar}`;
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
      setTotal(response.data.total || 0);
      setTotalPages(Math.ceil((response.data.total || 0) / LIMIT));
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error fetching results:", error);
    }
  };

  useEffect(() => {
    fetchResults(currentPage);
  }, [currentPage]);

  // Calculate statistics
  const completedTests = results
    .filter((r) => r.isCompleted)
    .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());
  const totalTests = completedTests.length;
  const highestScore = totalTests > 0 ? Math.max(...completedTests.map((r) => r.overallScore || 0)) : 0;
  const latestScore = completedTests[0]?.overallScore || 0;
  const averageScore = totalTests > 0 ? Math.round(completedTests.reduce((sum, r) => sum + (r.overallScore || 0), 0) / totalTests) : 0;
  const latestTestDate = completedTests[0]?.completedAt
    ? new Date(completedTests[0].completedAt).toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Henüz test tamamlanmadı";

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
                        {user?.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{user?.name}</h2>
                  <p className="text-sm text-gray-600">{user?.email || user?.username}</p>
                </div>

                {/* Stats Grid */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-500">Katılım Tarihi</p>
                      <p className="text-sm font-semibold text-gray-900">{user?.joinDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <Target className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-500">Toplam Test</p>
                      <p className="text-sm font-semibold text-gray-900">{totalTests}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <Trophy className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-500">En Yüksek Puan</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {highestScore > 0 ? `${highestScore} (${getCefrLevel(highestScore)})` : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <TrendingUp className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-500">Ortalama Puan</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {averageScore > 0 ? `${averageScore} (${getCefrLevel(averageScore)})` : "-"}
                      </p>
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
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">En Son Puan</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {latestScore > 0 ? latestScore : "-"}
                      </p>
                      {latestScore > 0 && (
                        <p className="text-sm text-gray-600 mt-1">{getCefrLevel(latestScore)}</p>
                      )}
                    </div>
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                      <Target className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">En Son Test</p>
                      <p className="text-sm font-semibold text-gray-900">{latestTestDate}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Test History */}
            <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Test Geçmişi</h3>

                {results.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">📊</div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Henüz test sonucu yok</h4>
                    <p className="text-gray-600 mb-6">Sınavınızı tamamladığınızda sonuçlar burada görünecek.</p>
                    <Button onClick={() => navigate("/test")} className="bg-red-600 hover:bg-red-700 text-white">
                      Test Başlat
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tarih</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Testler</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Puan</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Seviye</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {results.map((result) => (
                          <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {new Date(result.completedAt || result.startedAt).toLocaleDateString("tr-TR")}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">{getSelectedTests(result)}</td>
                            <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                              {result.overallScore || 0}
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {getCefrLevel(result.overallScore)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  result.isCompleted
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {result.isCompleted ? "Tamamlandı" : "Devam Ediyor"}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/unified-results/${result.id}`)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Toplam {total} sonuç, Sayfa {currentPage} / {totalPages}
                        </p>
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => fetchResults(currentPage - 1)}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => fetchResults(page)}
                                  isActive={currentPage === page}
                                  className={currentPage === page ? "border border-gray-300" : "cursor-pointer"}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => fetchResults(currentPage + 1)}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
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
                  {user?.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
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
