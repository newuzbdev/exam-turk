import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {  Calendar,  } from "lucide-react";
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
  return Math.round(score * 10) / 10; // Round to 1 decimal place
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
  return (
    <div>
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-blue-900">
              En Yüksek Puanlar
            </h2>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            {/* Card Header */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-gray-500 text-sm font-medium">
                KULLANICI
              </span>

            </div>

            {/* User Results List */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Yükleniyor...
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Henüz sonuç bulunmamaktadır.
                </div>
              ) : (
                users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0"
                >
                  {/* Left: Avatar and User Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={user.avatarUrl}
                        alt={user.name}
                      />
                      <AvatarFallback className="bg-gray-200 text-gray-600">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-lg">
                        {user.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{user.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Score Labels */}
                  <div className="flex items-center gap-2 mx-4">
                    <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700">
                      D: {user.dinleme}
                    </div>
                    <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700">
                      O: {user.okuma}
                    </div>
                    <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700">
                      Y: {user.yazma}
                    </div>
                    <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700">
                      K: {user.konusma}
                    </div>
                  </div>

                  {/* Right: Overall Result */}
                  <div className="font-bold text-gray-900 text-lg">
                    {user.overallScore} / {user.level}
                  </div>
                </div>
                ))
              )}
            </div>

            {/* Show More Link */}

          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeLastMonthTopResults;
