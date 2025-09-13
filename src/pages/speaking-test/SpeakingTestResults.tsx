import { ArrowLeft, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import speakingSubmissionService from "@/services/speakingSubmission.service";

interface SpeakingResult {
  id: string;
  userId: string;
  speakingTestId: string;
  score: number;
  aiFeedback?: string;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function SpeakingTestResults() {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resultId) {
      navigate("/test");
      return;
    }

    (async () => {
      try {
        const data = await speakingSubmissionService.getById(resultId);
        setResult(data);
      } catch (e) {
        navigate("/test");
      } finally {
        setLoading(false);
      }
    })();
  }, [resultId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" />
          <p className="mt-4 text-gray-600">Sonuçlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Sonuç bulunamadı</p>
          <Button onClick={() => navigate("/test")} className="mt-4">Teste Dön</Button>
        </div>
      </div>
    );
  }

  const submitted = new Date(result.submittedAt || result.createdAt || Date.now()).toLocaleString("tr-TR");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/test")} className="p-2 hover:bg-gray-100 rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-black">Speaking Test Results</h1>
                <p className="text-gray-600">Değerlendirme tamamlandı</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-red-600">{result.score ?? 0}</div>
              <div className="text-sm text-gray-600">Puan (100 üzerinden)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8 mb-8 text-center">
          <div className="w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Award className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-black mb-2">Test Tamamlandı!</h2>
          <p className="text-gray-600">Sonuçlarınız hazır.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="text-2xl font-bold text-black mb-1">{result.score ?? 0}</div>
              <div className="text-sm text-gray-600">Puan</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="text-2xl font-bold text-black mb-1">{submitted}</div>
              <div className="text-sm text-gray-600">Tamamlanma</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="text-2xl font-bold text-black mb-1">✓</div>
              <div className="text-sm text-gray-600">Gönderildi</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="text-2xl font-bold text-black mb-1">1</div>
              <div className="text-sm text-gray-600">Deneme</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-black mb-3">AI Tahlili</h3>
          <p className="text-gray-700 leading-relaxed">
            {result.aiFeedback?.trim() ? result.aiFeedback : "Yanıtlar eksik veya hiç yok. Sorulara hazırlık ve pratik yapmalısınız."}
          </p>
        </div>

        <div className="mt-8">
          <Button onClick={() => navigate("/test")} className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-md font-bold text-lg">
            Başka Bir Teste Geç
          </Button>
        </div>
      </div>
    </div>
  );
}
