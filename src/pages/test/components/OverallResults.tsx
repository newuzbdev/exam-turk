import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosPrivate from "@/config/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { overallTestFlowStore } from "@/services/overallTest.service";

interface OverallItem {
  type: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
  resultId?: string;
  score?: number;
  correctCount?: number;
  totalQuestions?: number;
}

interface OverallResponse {
  id?: string;
  userId?: string;
  createdAt?: string;
  completedAt?: string;
  items?: OverallItem[];
  // fallbacks some backends might return
  listeningResultId?: string;
  readingResultId?: string;
  writingResultId?: string;
  speakingResultId?: string;
  results?: OverallItem[];
}

export default function OverallResults() {
  const params = useParams<{ overallId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<OverallResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const retriesRef = useRef(0);
  useEffect(() => {
    const id = params.overallId;
    if (!id) { navigate("/test"); return; }

    let active = true;
    const fetchOnce = async () => {
      setLoading(true);
      try {
        console.log("Fetching overall results for ID:", id);
        const res = await axiosPrivate.get(`/api/overal-test-result/${id}/results`);
        console.log("Overall results response:", res.data);
        const payload = (res?.data?.data || res?.data || null) as OverallResponse | null;
        if (!active) return;
        setData(payload);

        // If not all results present yet, poll a few times
        const expected = Math.max(2, overallTestFlowStore.getInitialCount());
        const currentItems = normalizeItems(payload).length;
        console.log("Expected items:", expected, "Current items:", currentItems, "Retries:", retriesRef.current);
        if (expected > 1 && currentItems < expected && retriesRef.current < 5) {
          retriesRef.current += 1;
          setTimeout(fetchOnce, 1200);
          return;
        }
      } catch (e) {
        console.error("Error fetching overall results:", e);
        if (!active) return;
        setData(null);
      }
      if (active) setLoading(false);
    };

    // exit exam mode on entering overall results
    try { document?.body?.classList?.remove("exam-mode"); } catch {}
    fetchOnce();
    return () => { active = false; };
  }, [params.overallId, navigate]);

  const normalizeItems = (resp: OverallResponse | null): OverallItem[] => {
    if (!resp) return [];
    if (Array.isArray(resp.items) && resp.items.length) return resp.items;
    if (Array.isArray(resp.results) && resp.results.length) return resp.results as OverallItem[];
    const out: OverallItem[] = [];
    if (resp.listeningResultId) out.push({ type: "LISTENING", resultId: resp.listeningResultId });
    if (resp.readingResultId) out.push({ type: "READING", resultId: resp.readingResultId });
    if (resp.writingResultId) out.push({ type: "WRITING", resultId: resp.writingResultId });
    if (resp.speakingResultId) out.push({ type: "SPEAKING", resultId: resp.speakingResultId });
    return out;
  };

  const items = useMemo(() => normalizeItems(data), [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Overall results not found</p>
          <Button onClick={() => navigate("/test")} className="mt-4">Back to Tests</Button>
        </div>
      </div>
    );
  }

  const goTo = (type: string, resultId?: string) => {
    if (!resultId) return;
    if (type === "LISTENING") navigate(`/listening-test/results/${resultId}`);
    else if (type === "READING") navigate(`/reading-test/results/${resultId}`);
    else if (type === "WRITING") navigate(`/writing-test/results/${resultId}`);
    else if (type === "SPEAKING") navigate(`/speaking-test/results/${resultId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Overall Results</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((it, idx) => (
            <Card key={idx} className="border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-900 font-semibold">{it.type}</div>
                    <div className="text-gray-600 text-sm mt-1">
                      {typeof it.score === "number" ? `Score: ${it.score}` : null}
                      {typeof it.correctCount === "number" && typeof it.totalQuestions === "number"
                        ? ` • ${it.correctCount}/${it.totalQuestions}`
                        : null}
                    </div>
                  </div>
                  <div>
                    <Button onClick={() => goTo(it.type, it.resultId)} disabled={!it.resultId}>
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8">
          <Button variant="outline" onClick={() => navigate("/test")}>Back to Tests</Button>
        </div>
      </div>
    </div>
  );
}


