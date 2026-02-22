import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestUnifiedResults() {
  const navigate = useNavigate();
  const [testId, setTestId] = useState("test123");

  const handleTestUnifiedResults = () => {
    navigate(`/unified-results/${testId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="p-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Test Birleşik Sonuçlar Sayfası</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Bu sayfa, tüm test türleri için sekmelerle birleşik sonuçlar sayfasını test etmenizi sağlar.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Not: Bu bir demo sayfasıdır. Gerçek senaryoda, tamamlanan test sonuçlarından buraya yönlendirilirsiniz.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="w-full max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test ID (demo amaçlı):
                </label>
                <input
                  type="text"
                  value={testId}
                  onChange={(e) => setTestId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black/15 focus:ring-offset-0 focus:border-gray-400"
                  placeholder="Test ID girin"
                />
              </div>

              <Button
                onClick={handleTestUnifiedResults}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
              >
                Birleşik Sonuçları Görüntüle
              </Button>
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Özellikler:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Dinleme, Okuma, Yazma ve Konuşma için 4 sekme</li>
                <li>• Her sekme ilgili test sonuçlarını gösterir</li>
                <li>• Sekme etiketlerinde puan rozetleri</li>
                <li>• Mobil ve masaüstü için duyarlı tasarım</li>
                <li>• Tüm test türlerinde tutarlı UI</li>
              </ul>
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => navigate("/test")}
                className="px-6"
              >
                Testlere Dön
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
