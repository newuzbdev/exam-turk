"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ReadingPart3() {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const handleAnswerSelect = (question: string, answer: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [question]: answer }));
  };

  const questions = [
    { id: "A", text: "Özbekistan'da Olimpiyat Ruhunun Modern Spor Üzerindeki Etkileri" },
    { id: "B", text: "Aracınızda bir arıza var, onarımak istiyorsunuz." },
    { id: "C", text: "Kangalınız kuduz olduğunda, sorunu çözmek istiyorsunuz." },
    { id: "D", text: "Bir yakınınız, yeni ve cazip bir apartmanda bir daire kiralamak istiyor." },
    { id: "E", text: "Evinizi tamir etmek istiyorsunuz." },
    { id: "F", text: "Evinizin duvarlarını boyatmak istiyorsunuz." },
    { id: "G", text: "Gece yarısı kızınız dental implant ağrısıyla uyandı." },
    { id: "H", text: "Evinizin duvarlarını boyatmak istiyorsunuz." },
  ];

  return (
    <div className="bg-white border-2 border-black rounded-lg p-6 mx-auto mt-4 mb-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">3. OKUMA METNİ</h2>
        <p className="text-gray-700 mb-6">
          Sorular 15-20. Aşağıdaki başlıkları (A-H) ve paragrafları (15-20) okuyunuz. Her paragraf için uygun bir
          başlık bulunuz. Her başlık yalnız bir defa kullanılabilir.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Paragraphs */}
        <div className="space-y-6">
          {/* S15 Paragraph */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="font-bold">S15. I. paragraf</span>
              <Input
                className="w-16 h-8 text-center border border-black"
                value={selectedAnswers["S15"] || ""}
                onChange={(e) => handleAnswerSelect("S15", e.target.value.toUpperCase())}
                maxLength={1}
              />
            </div>
            <Card className="p-4 bg-gray-50 border border-black">
              <p className="text-sm leading-relaxed">
                Paris 2024 Olimpiyat Oyunları, modern olimpiyat tarihinin en önemli etkinliklerinden biri olarak kabul
                ediliyor. Bu oyunlar, Paris'in üçüncü kez ev sahipliği yaptığı oyunlar olarak tarihe geçecek. Ancak
                Paris 2024, sadece tarihi bir olay olmanın ötesinde, yenilikçi yaklaşımları ve çevre dostu projeleriyle
                de dikkat çekiyor. Sürdürülebilirlik, oyunların merkezinde yer alıyor ve kullanılan malzemelerin büyük
                çoğunluğu geri dönüştürülebilir olacak şekilde tasarlandı. Olimpiyat Köyü, enerji verimliliği göz önünde
                bulundurularak inşa edildi ve oyunlar sırasında çevreye verilen zararın minimum indirgemesi hedeflendi.
                Paris 2024, bu anlamda sadece bir spor etkinliği değil, aynı zamanda gelecekteki uluslararası
                organizasyonlara örnek teşkil edecek bir model olarak da görülüyor.
              </p>
            </Card>
          </div>

          {/* S16 Paragraph */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="font-bold">S16. II. paragraf</span>
              <Button className="bg-gray-200 hover:bg-gray-300 text-black border border-black px-3 py-1 text-sm">
                SEÇ
              </Button>
            </div>
            <Card className="p-4 bg-gray-50 border border-black">
              <p className="text-sm leading-relaxed">
                Paris 2024 Olimpiyat Oyunları, modern olimpiyat tarihinin en önemli etkinliklerinden biri olarak kabul
                ediliyor. Bu oyunlar, Paris'in üçüncü kez ev sahipliği yaptığı oyunlar olarak tarihe geçecek. Ancak
                Paris 2024, sadece tarihi bir olay olmanın ötesinde, yenilikçi yaklaşımları ve çevre dostu projeleriyle
                de dikkat çekiyor. Sürdürülebilirlik, oyunların merkezinde yer alıyor ve kullanılan malzemelerin büyük
                çoğunluğu geri dönüştürülebilir olacak şekilde tasarlandı. Olimpiyat Köyü, enerji verimliliği göz önünde
                bulundurularak inşa edildi ve oyunlar sırasında çevreye verilen zararın minimum indirgemesi hedeflendi.
                Paris 2024, bu anlamda sadece bir spor etkinliği değil, aynı zamanda gelecekteki uluslararası organizasyonlara
                örnek
              </p>
            </Card>
          </div>
        </div>

        {/* Right Column - Answer Choices */}
        <div className="border-l-2 border-dashed border-gray-400 pl-8">
          <div className="space-y-3">
            {questions.map((question) => (
              <div
                key={question.id}
                className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                onClick={() => handleAnswerSelect("S15", question.id)}
              >
                <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-bold bg-white">
                  {question.id}
                </div>
                <p className="text-sm leading-relaxed flex-1">{question.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation (static preview for this part) */}
      <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-400">
        <div className="flex justify-center gap-4 flex-wrap">
          {[
            { id: 1, numbers: [1, 2, 3, 4, 5, 6] },
            { id: 2, numbers: [7, 8, 9, 10, 11, 12, 13, 14] },
            { id: 3, numbers: [15, 16, 17, 18, 19, 20] },
            { id: 4, numbers: [21, 22, 23, 24, 25, 26, 27, 28, 29] },
            { id: 5, numbers: [30, 31, 32, 33, 34, 35] },
          ].map((section) => (
            <Card key={section.id} className="p-4 border-2 border-black bg-white">
              <div className="flex items-center gap-2 mb-2">
                {section.numbers.map((num) => (
                  <div
                    key={num}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                      num === 15 || num === 16 ? "bg-green-400 border-green-600 text-white" : "bg-white border-black text-black"
                    }`}
                  >
                    {num}
                  </div>
                ))}
              </div>
              <div className="text-center text-sm font-bold">{section.id}.BÖLÜM</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}


