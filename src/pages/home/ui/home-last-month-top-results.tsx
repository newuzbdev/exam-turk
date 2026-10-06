import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown } from "lucide-react";
import { overallTestService } from "@/services/overallTest.service";
import { toApiUrl } from "@/config/runtime";
import { SectionHeader, tm } from "@/components/tm";

import { formatSectionScore } from "./home-results-data";
import "./home-results.css";

const TEST_SCOPE_OPTIONS = [
  { key: "ALL", label: "Hepsi" },
  { key: "LISTENING", label: "Dinleme" },
  { key: "READING", label: "Okuma" },
  { key: "WRITING", label: "Yazma" },
  { key: "SPEAKING", label: "Konuşma" },
  { key: "FULL", label: "Tam Test" },
] as const;
type TestScopeOption = (typeof TEST_SCOPE_OPTIONS)[number]["key"];

interface UserResult {
  id: string;
  name: string;
  avatarUrl?: string;
  date: string;
  dinleme: number | null;
  okuma: number | null;
  yazma: number | null;
  konusma: number | null;
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
  updatedAt?: string;
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

const HomeLastMonthTopResults = () => {
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTestScope, setSelectedTestScope] = useState<TestScopeOption>("ALL");

  useEffect(() => {
    let cancelled = false;
    const fetchRecentResults = async () => {
      try {
        setLoading(true);
        // The API applies the selected scope before limiting the result set.
        const data = await overallTestService.getRecentQualifiedOverallTests(
          15,
          undefined,
          true,
          selectedTestScope,
        );

        const recentResults = data as ApiResult[];

        const mappedUsers: UserResult[] = recentResults.map((item: ApiResult) => {
          const resultUser: ApiUser = item.user || { id: "", name: "Anonim" };
          const date = item.completedAt || item.updatedAt || item.createdAt || "";
          const avatarUrl = resultUser.avatarUrl || resultUser.avatar;
          const roundedOverall = Math.round(item.overallScore || 0);
          const formattedAvatarUrl = avatarUrl
            ? avatarUrl.startsWith("http")
              ? avatarUrl
              : toApiUrl(avatarUrl)
            : undefined;

          return {
            id: item.id,
            name: resultUser.name || "Anonim",
            avatarUrl: formattedAvatarUrl,
            date: formatDate(date),
            dinleme: formatSectionScore(item.listeningScore),
            okuma: formatSectionScore(item.readingScore),
            yazma: formatSectionScore(item.writingScore),
            konusma: formatSectionScore(item.speakingScore),
            overallScore: roundedOverall,
            level: getCefrLevel(roundedOverall),
          };
        });

        if (!cancelled) setUsers(mappedUsers);
      } catch (error) {
        console.error("Error fetching recent results:", error);
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRecentResults();
    return () => { cancelled = true; };
  }, [selectedTestScope]);

  return (
    <section id="son-sinav-sonuclari" className={`${tm.section} home-results scroll-mt-20`}>
      <div className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Son Sınav Sonuçları"
          description="En yeni deneme sonuçları ve beceri puanları."
          align="center"
        />
        <div className="home-results__toolbar">
          <div className="home-results__filter">
            <select aria-label="Sonuçları sınav türüne göre filtrele"
              value={selectedTestScope}
              onChange={(event) => setSelectedTestScope(event.target.value as TestScopeOption)}>
              {TEST_SCOPE_OPTIONS.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </div>
        </div>
        {loading ? (
          <p className="home-results__empty" role="status">Sonuçlar yükleniyor…</p>
        ) : users.length === 0 ? (
          <p className="home-results__empty" role="status">Bu sınav türünde henüz sonuç yok.</p>
        ) : (
          <div className="home-results__scroll" tabIndex={0} role="region" aria-label="Son sınav sonuçları tablosu">
            <table className="home-results__table">
              <thead><tr>
                <th scope="col">Katılımcı</th>
                <th scope="col">Dinleme</th>
                <th scope="col">Okuma</th>
                <th scope="col">Yazma</th>
                <th scope="col">Konuşma</th>
                <th scope="col">Puan / Seviye</th>
              </tr></thead>
              <tbody>{users.map(user => (
                <tr key={user.id}>
                  <th scope="row">
                    <div className="home-results__person">
                      <Avatar className="h-10 w-10 shrink-0" data-protected-media="avatar"
                        onContextMenu={event => event.preventDefault()} onDragStart={event => event.preventDefault()}>
                        <AvatarImage src={user.avatarUrl} alt="" draggable={false}
                          className="pointer-events-none select-none object-cover"
                          referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                        <AvatarFallback className="bg-gray-100 text-gray-700 text-sm font-semibold">
                          {user.name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("").toLocaleUpperCase("tr-TR")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="home-results__identity">
                        <span className="home-results__name">{user.name}</span>
                        <span className="home-results__date">{user.date}</span>
                      </div>
                    </div>
                  </th>
                  {[user.dinleme, user.okuma, user.yazma, user.konusma].map((score, index) => (
                    <td key={index} className={score === null ? "home-results__missing" : undefined}>
                      <span aria-label={score === null ? "Katılmadı" : undefined}>{score === null ? "×" : Math.round(score)}</span>
                    </td>
                  ))}
                  <td><div className="home-results__score"><strong>{user.overallScore}</strong><span>/ {user.level}</span></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default HomeLastMonthTopResults;
