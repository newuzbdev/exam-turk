import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Zap } from "lucide-react";
import { overallTestService } from "@/services/overallTest.service";

interface UserResult {
  id: string;
  name: string;
  avatarUrl?: string;
  date: string;
  dinleme: number;
  okuma: number;
  yazma: number;
  konusma: number;
  overallScore: number;
  level: string;
}

interface ApiUser {
  id: string;
  name: string;
  avatar?: string;
  avatarUrl?: string;
}

interface ApiResult {
  id: string;
  user?: ApiUser;
  listeningScore?: number | null;
  readingScore?: number | null;
  writingScore?: number | null;
  speakingScore?: number | null;
  overallScore: number;
  completedAt?: string | null;
  createdAt?: string;
}

const getCefrLevel = (score: number | null | undefined): string => {
  if (score == null) return "-";
  if (score >= 65) return "C1";
  if (score >= 51) return "B2";
  if (score >= 38) return "B1";
  return "B1 altı";
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const formatScore = (score: number | null | undefined): number => {
  if (score == null) return 0;
  return Math.round(score * 10) / 10;
};

const HomeLastMonthTopResults = () => {
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentResults = async () => {
      try {
        setLoading(true);
        const data = await overallTestService.getRecentQualifiedOverallTests(15);

        const mappedUsers: UserResult[] = data.map((item: ApiResult) => {
          const user: ApiUser = item.user || { id: "", name: "Anonim" };
          const date = item.completedAt || item.createdAt || "";
          const avatarUrl = user.avatarUrl || user.avatar;
          const formattedAvatarUrl = avatarUrl
            ? avatarUrl.startsWith("http")
              ? avatarUrl
              : `https://api.turkishmock.uz/${avatarUrl}`
            : undefined;

          return {
            id: item.id,
            name: user.name || "Anonim",
            avatarUrl: formattedAvatarUrl,
            date: formatDate(date),
            dinleme: formatScore(item.listeningScore),
            okuma: formatScore(item.readingScore),
            yazma: formatScore(item.writingScore),
            konusma: formatScore(item.speakingScore),
            overallScore: Math.round(item.overallScore || 0),
            level: getCefrLevel(item.overallScore),
          };
        });

        setUsers(mappedUsers.slice(0, 15));
      } catch (error) {
        console.error("Error fetching recent results:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentResults();
  }, []);

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case 1:
        return "bg-gray-50 text-gray-700 border-gray-200";
      case 2:
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-white text-gray-500 border-gray-200";
    }
  };

  return (
    <section className="py-16 sm:py-20 bg-gray-50 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-gray-200 bg-white mb-3">
            <Zap className="w-4.5 h-4.5 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-semibold text-gray-700 tracking-tight">Sonuçlar</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-semibold text-gray-900 mb-2 tracking-tight">
            Son Sınav Sonuçları
          </h2>
          <p className="text-gray-500 text-sm">B1, B2 ve C1 seviyesindeki son 15 kullanıcı</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin w-7 h-7 border-2 border-red-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-500 text-sm">Sonuçlar yükleniyor...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm">B1 ve üzeri seviyede sonuç bulunamadı.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <div className="hidden sm:grid grid-cols-[28px_1.6fr_1fr_160px] gap-4 px-5 py-3 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                <span>#</span>
                <span>Kullanıcı</span>
                <span>Alt Skorlar</span>
                <span>Puan / Seviye</span>
              </div>
              {users.map((user, index) => (
                <div
                  key={user.id}
                  className="group px-4 sm:px-5 py-4 transition-colors hover:bg-gray-50/70"
                >
                  <div className="grid grid-cols-[28px_1fr] sm:grid-cols-[28px_1.6fr_1fr_160px] gap-4 items-center">
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold border ${getRankStyle(index)}`}>
                      {index + 1}
                    </div>

                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-gray-200">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="bg-gray-900 text-white font-bold">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">{user.name}</h4>
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span className="truncate">{user.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-2">
                      {[
                        { l: "D", v: user.dinleme },
                        { l: "O", v: user.okuma },
                        { l: "Y", v: user.yazma },
                        { l: "K", v: user.konusma },
                      ].map((score, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200"
                        >
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{score.l}</span>
                          <span className="text-xs font-bold text-gray-700">{Math.round(score.v)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="hidden sm:flex items-center gap-2">
                      <span className="block text-base font-bold text-gray-900">{user.overallScore}</span>
                      <span className="text-gray-400 text-sm font-semibold">/</span>
                      <span className="text-sm font-semibold text-gray-700">{user.level}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{user.overallScore}</span>
                        <span className="text-gray-400 text-xs font-semibold">/</span>
                        <span className="text-xs font-semibold text-gray-700">{user.level}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HomeLastMonthTopResults;

