import { useState } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Input } from "@/components/ui/input";

export default function ReadingPart2() {
  const [answers, setAnswers] = useState<{ s7: string; s8: string }>({ s7: "A", s8: "A" });
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const multipleChoiceOptions = [
    { id: "A", text: "Baytar olarak çalışmak istiyorsunuz." },
    { id: "B", text: "Aracınızda bir arıza var, onarmak istiyorsunuz." },
    { id: "C", text: "Kangalınız kuduz olduğunda, sorunu çözmek istiyorsunuz." },
    { id: "D", text: "Bir yakınınız, yeni ve cazip bir apartmanda bir daire kiralamak istiyor." },
    { id: "E", text: "Evinizi tamir etmek istiyorsunuz." },
    { id: "F", text: "Evinizin duvarlarını boyatmak istiyorsunuz." },
    { id: "G", text: "Gece yarısı kızınız dental implant ağrısıyla uyandı." },
    { id: "H", text: "Evinizin duvarlarını boyatmak istiyorsunuz." },
    { id: "I", text: "Evinizin duvarlarını boyatmak istiyorsunuz." },
    { id: "J", text: "Lazerle göz estetik yöntemleri hakkında bilgi almak istiyorsunuz." },
  ];

  return (
    <div>
      <div className="p-4 md:p-6 bg-white rounded-xl mx-auto  mt-4 mb-4">
        <ResizablePanelGroup direction="horizontal" className="items-stretch">
          <ResizablePanel defaultSize={66} minSize={40}>
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold mb-4">2. OKUMA METNİ.</h2>
                <p className="text-sm leading-relaxed mb-6">
                  Sorular 7-14. Aşağıda verilen durumları (A-J) ve bilgi metinlerini (7-14) okuyunuz. Her durum için
                  uygun olan metni bulup uygun seçeneği işaretleyiniz. Her seçenek yalnız bir defa kullanılabilir.
                  Seçilmemesi gereken İKİ seçenek bulunmaktadır.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold">S.7</span>
                    <Input
                      className="w-16 rounded-lg text-center font-bold"
                      value={answers.s7}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, s7: e.target.value }))}
                    />
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <div className="text-center font-bold text-lg mb-3">İSTANBUL-SİLİVRİSARAY EVLERİ</div>
                    <div className="text-sm space-y-2">
                      <p>
                        Silivrisaray Evleri; denize sıfır konumu, büyük bahçeleri, temiz havası, güvenli, huzurlu ve
                        keyifli ortamıyla sakinlerine yeni bir daireden ziyade, yeni bir yaşam vaat ediyor.
                      </p>
                      <div className="space-y-1 mt-3">
                        <p>
                          <strong>Satılık Dairelerin Teslim Tarihi:</strong> Hemen
                        </p>
                        <p>
                          <strong>Daire Sayısı:</strong> 86
                        </p>
                        <p>
                          <strong>Toplam Proje Alanı:</strong> 20.000 m²
                        </p>
                      </div>
                      <div className="mt-3 space-y-1">
                        <p>
                          <strong>İletişim Bilgileri:</strong>
                        </p>
                        <p>Tel.: 0 (212) 728 05 32</p>
                        <p>Satış Ofisi: Fatih Mahallesi Bağlar Sokak</p>
                        <p>No:2 Silivri/İSTANBUL</p>
                        <p>www.silivrisaray.com</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold">S.8</span>
                    <Input
                      className="w-16 rounded-lg text-center font-bold"
                      value={answers.s8}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, s8: e.target.value }))}
                    />
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <div className="text-center font-bold text-lg mb-3">İSTANBUL-SİLİVRİSARAY EVLERİ</div>
                    <div className="text-sm space-y-2">
                      <p>
                        Silivrisaray Evleri; denize sıfır konumu, büyük bahçeleri, temiz havası, güvenli, huzurlu ve
                        keyifli ortamıyla sakinlerine yeni bir daireden ziyade, yeni bir yaşam vaat ediyor.
                      </p>
                      <div className="space-y-1 mt-3">
                        <p>
                          <strong>Satılık Dairelerin Teslim Tarihi:</strong> Hemen
                        </p>
                        <p>
                          <strong>Daire Sayısı:</strong> 86
                        </p>
                        <p>
                          <strong>Toplam Proje Alanı:</strong> 20.000 m²
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle variant="grip" />

          <ResizablePanel defaultSize={34} minSize={25}>
            <div className="space-y-3">
              {multipleChoiceOptions.map((option) => (
                <div
                  key={option.id}
                  className="flex items-start gap-3 cursor-pointer p-2 rounded"
                  onClick={() => setSelectedAnswers((prev) => ({ ...prev, [option.id]: option.text }))}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">
                    {option.id}
                  </div>
                  <span className="text-sm leading-relaxed">{option.text}</span>
                </div>
              ))}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}


