import { useState } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Input } from "@/components/ui/input";

interface ReadingPart5Props {
  answers?: Record<string, string>;
  onAnswerChange?: (questionId: string, value: string) => void;
}

export default function ReadingPart5({ answers = {}, onAnswerChange }: ReadingPart5Props) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(answers);
  const [paragraphAnswers, setParagraphAnswers] = useState<Record<string, string>>(answers);

  const multipleChoiceOptions30_32 = [
    { id: "A", text: "Trafikte takılıp kaldım, her şey arapsaçına döndü.", selected: true },
    { id: "B", text: "İşler yolundaydı, sorunsuz geldim." },
    { id: "C", text: "Yolda hiçbir sorun yaşamadım" },
    { id: "D", text: "Yolda hiçbir sorun yaşamadım" },
  ];

  const handleAnswerChange = (questionId: string, value: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: value }));
    onAnswerChange?.(questionId, value);
  };

  const handleParagraphAnswerChange = (questionId: string, value: string) => {
    setParagraphAnswers(prev => ({ ...prev, [questionId]: value }));
    onAnswerChange?.(questionId, value);
  };

  return (
    <div>
      <div className="p-4 md:p-6 bg-yellow-50 rounded-xl">
        <ResizablePanelGroup direction="horizontal" className="items-stretch">
          <ResizablePanel defaultSize={66} minSize={40}>
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold mb-4">5. OKUMA METNİ.</h2>
                <p className="text-sm leading-relaxed mb-6">Sorular 30-35. sorular için aşağıdaki metni okuyunuz.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-center font-bold text-lg">E-Kitaplar Okuma Tarzını Değiştiriyor mu?</h3>

                <div className="text-sm leading-relaxed space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-lg bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center">A</span>
                      <p className="flex-1">... paragraf metni ...</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-lg bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center">B</span>
                      <p className="flex-1">... paragraf metni ...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle variant="grip" />

          <ResizablePanel defaultSize={34} minSize={25}>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-sm font-medium">Sorular 30-32. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz.</div>
                {multipleChoiceOptions30_32.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-start gap-3 cursor-pointer p-2 rounded"
                    onClick={() => handleAnswerChange('q30', option.id)}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selectedAnswers.q30 === option.id ? "bg-green-500 text-white" : ""}`}>
                      {selectedAnswers.q30 === option.id && <div className="w-3 h-3 bg-green-500 rounded-full"></div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{option.id})</span>
                      <span className="text-sm">{option.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">S33.</span>
                    <Input value={paragraphAnswers.s33 || ''} onChange={(e) => handleParagraphAnswerChange('s33', e.target.value)} className="w-16 h-8 text-center" />
                  </div>
                  <p className="text-xs text-gray-600">Elektronik okumanın beynin kavrama yetisi ve dikkat üzerindeki etkisi, hangi paragrafta yer almaktadır?</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">S34.</span>
                    <Input value={paragraphAnswers.s34 || ''} onChange={(e) => handleParagraphAnswerChange('s34', e.target.value)} className="w-16 h-8 text-center" />
                  </div>
                  <p className="text-xs text-gray-600">Elektronik okumanın beynin kavrama yetisi ve dikkat üzerindeki etkisi, hangi paragrafta yer almaktadır?</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">S35.</span>
                    <Input value={paragraphAnswers.s35 || ''} onChange={(e) => handleParagraphAnswerChange('s35', e.target.value)} className="w-16 h-8 text-center" />
                  </div>
                  <p className="text-xs text-gray-600">Elektronik okumanın beynin kavrama yetisi ve dikkat üzerindeki etkisi, hangi paragrafta yer almaktadır?</p>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}


