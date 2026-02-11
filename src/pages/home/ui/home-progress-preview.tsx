import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axiosPrivate from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TestResult {
  id: string;
  completedAt: string | null;
  overallScore: number;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  data: TestResult[];
}

const getCefrLevel = (score: number | null | undefined): string => {
  if (score == null) return "-";
  if (score >= 65) return "C1";
  if (score >= 51) return "B2";
  if (score >= 38) return "B1";
  return "B1 altı";
};

const HomeProgressPreview = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [lastResult, setLastResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const fetchLastResult = async () => {
      try {
        setLoading(true);
        const res = await axiosPrivate.get<PaginationData>(
          "/api/overal-test-result/get-users?page=1&limit=1"
        );
        const payload = (res.data || {}) as PaginationData;
        const first = payload.data?.[0] || null;
        setLastResult(first);
      } catch (error) {
        console.error("Error fetching last overall result:", error);
        setLastResult(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLastResult();
  }, [isAuthenticated, isLoading]);

  if (!isAuthenticated || isLoading || loading || !lastResult) {
    return null;
  }

  const level = getCefrLevel(lastResult.overallScore);

  return (
    <section className="bg-gray-50 border-t border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mb-16 relative z-10">
        <Card className="shadow-lg border-red-100 bg-white/95 backdrop-blur-sm mt-12">
          <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-1">
                Son Test Sonucunuz
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Seviye: {level}{" "}
                <span className="text-base font-normal text-gray-600">
                  (Toplam Puan: {lastResult.overallScore}/75)
                </span>
              </h3>
              {lastResult.completedAt && (
                <p className="text-sm text-gray-500">
                  Tamamlanma tarihi:{" "}
                  {new Date(lastResult.completedAt).toLocaleString("tr-TR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                onClick={() => navigate(`/overall-results/${lastResult.id}`)}
              >
                Sonuçları Gör
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => navigate("/test")}
              >
                Yeni Teste Başla
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default HomeProgressPreview;

