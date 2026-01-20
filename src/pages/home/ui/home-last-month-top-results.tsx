import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Trophy, Medal } from "lucide-react";
import { overallTestService } from "@/services/overallTest.service";
import { Badge } from "@/components/ui/badge";

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
  if (score >= 90) return "C2";
  if (score >= 75) return "C1";
  if (score >= 60) return "B2";
  if (score >= 45) return "B1";
  if (score >= 30) return "A2";
  return "A1";
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
    const fetchTopResults = async () => {
      try {
        setLoading(true);
        const data = await overallTestService.getTopOverallTestsLast30Days();

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

        setUsers(mappedUsers);
      } catch (error) {
        console.error("Error fetching top results:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopResults();
  }, []);

  // Sıralama rozeti rengi belirleme
  const getRankStyle = (index: number) => {
    switch(index) {
      case 0: return "bg-yellow-100 text-yellow-700 border-yellow-200"; // Altın
      case 1: return "bg-gray-100 text-gray-700 border-gray-200"; // Gümüş
      case 2: return "bg-orange-100 text-orange-800 border-orange-200"; // Bronz
      default: return "bg-white text-gray-500 border-gray-100";
    }
  };

  return (
    <section className="py-24 bg-gray-50 font-sans border-t border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 bg-white mb-6 shadow-sm">
            <Trophy className="w-4 h-4 text-red-600" />
            <span className="text-sm font-bold text-gray-900 tracking-tight">Lider Tablosu</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-black mb-4 tracking-tight">
            Son 30 Günün En İyileri
          </h2>
          <p className="text-gray-500 font-medium">
            En yüksek puanı alan kullanıcılarımız
          </p>
        </div>

        {/* List Content */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium">Sonuçlar yükleniyor...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <p className="text-gray-500 font-medium">Henüz sonuç bulunmamaktadır.</p>
            </div>
          ) : (
            users.map((user, index) => (
              <div
                key={user.id}
                className="group relative bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:border-red-200 hover:-translate-y-0.5 flex flex-col sm:flex-row items-center gap-6"
              >
                {/* 1. Bölüm: Sıra & Avatar & İsim */}
                <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
                  {/* Sıra Numarası */}
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border ${getRankStyle(index)}`}>
                    {index + 1}
                  </div>

                  <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="bg-gray-900 text-white font-bold">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h4 className="font-bold text-gray-900 text-base">{user.name}</h4>
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{user.date}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Bölüm: Alt Puanlar (Desktop'ta görünür) */}
                <div className="hidden md:flex items-center gap-3">
                  {[
                    { l: 'D', v: user.dinleme },
                    { l: 'O', v: user.okuma },
                    { l: 'Y', v: user.yazma },
                    { l: 'K', v: user.konusma }
                  ].map((score, i) => (
                    <div key={i} className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 group-hover:border-red-50 transition-colors">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{score.l}</span>
                      <span className="text-sm font-bold text-gray-700">{Math.round(score.v)}</span>
                    </div>
                  ))}
                </div>

                {/* 3. Bölüm: Toplam Puan & Seviye */}
                <div className="flex items-center justify-between w-full sm:w-auto gap-6 sm:border-l sm:border-gray-100 sm:pl-6">
                  <div className="text-right sm:text-left">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">TOPLAM</span>
                    <span className="block text-xl font-extrabold text-gray-900">{user.overallScore}</span>
                  </div>

                  <Badge className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-lg font-bold">
                    {user.level}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </section>
  );
};

export default HomeLastMonthTopResults;
