import { useState } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export default function ReadingPart4() {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({ q21: "A", q25: "A" });

  const multipleChoiceOptions21_24 = [
    { id: "A", text: "Trafikte takılıp kaldım, her şey arapsaçına döndü.", selected: true },
    { id: "B", text: "İşler yolundaydı, sorunsuz geldim." },
    { id: "C", text: "Yolda hiçbir sorun yaşamadım" },
    { id: "D", text: "Yolda hiçbir sorun yaşamadım" },
  ];

  const trueFalseOptions = [
    { id: "A", text: "Doğru", selected: true },
    { id: "B", text: "Yanlış" },
    { id: "C", text: "Verilmemiş" },
  ];

  return (
    <div>
      <div className="p-4 md:p-6 bg-white rounded-xl">
        <ResizablePanelGroup direction="horizontal" className="items-stretch">
          <ResizablePanel defaultSize={66} minSize={40}>
            <div className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-center font-bold text-lg">Dünüyle Bugünüyle Halk Oyunları ve Dans</h3>
                <div className="text-sm leading-relaxed space-y-4">
                  <p>
                    Dünya tek bir hareketle ortaya çıktı. Sonra bu ilk hareket bir ritim tutturdu, insanlık tarihi
                    boyunca renklerini değiştirerek, kendini geliştirerek varlığını sürdürmeye devam etti...
                  </p>
                  <p>
                    Yinelediği ritmik hareketlerin doğaüstü etkileri olduğunu fark eden insan, her ritüelde bu gizemli
                    gücü yeniden yaratığı duygusuna kapılmış, dansı büyülü bulmuştur...
                  </p>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle variant="grip" />

          <ResizablePanel defaultSize={34} minSize={25}>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="font-bold text-sm">
                  S21. Metnin bütününe göre aşağıdaki yargılardan hangisine varılamaz?
                </div>
                {multipleChoiceOptions21_24.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-start gap-3 cursor-pointer p-2 rounded"
                    onClick={() => setSelectedAnswers((prev) => ({ ...prev, q21: option.id }))}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selectedAnswers.q21 === option.id ? "bg-green-500 text-white" : ""}`}>
                      {selectedAnswers.q21 === option.id && <div className="w-3 h-3 bg-green-500 rounded-full"></div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{option.id})</span>
                      <span className="text-sm">{option.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="font-bold text-sm">
                  S25. Dansın ilk örnekleri dini törenler ve ibadetlerle ilgili olarak ortaya çıkmıştır
                </div>
                {trueFalseOptions.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center gap-3 cursor-pointer p-2 rounded"
                    onClick={() => setSelectedAnswers((prev) => ({ ...prev, q25: option.id }))}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedAnswers.q25 === option.id ? "bg-green-500 text-white" : ""}`}>
                      {selectedAnswers.q25 === option.id && <div className="w-3 h-3 bg-green-500 rounded-full"></div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{option.id})</span>
                      <span className="text-sm">{option.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}


