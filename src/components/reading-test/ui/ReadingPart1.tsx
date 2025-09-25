import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function ReadingPart1() {
  const [answers, setAnswers] = useState({
    S1: "",
    S2: "",
    S3: "",
    S4: "",
    S5: "",
    S6: "",
  });

  const handleAnswerChange = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const multipleChoiceOptions = [
    { letter: "A", text: "derin" },
    { letter: "B", text: "doğaüstü" },
    { letter: "C", text: "kademsizlik" },
    { letter: "D", text: "derin" },
    { letter: "E", text: "doğaüstü" },
    { letter: "F", text: "kademsizlik" },
    { letter: "G", text: "derin" },
    { letter: "H", text: "doğaüstü" },
  ];


  return (
    <div className="min-h-screen bg-gray-50 p-4">
     <div className="mx-auto  mt-4 mb-4">
          <div className="p-4 md:p-6 bg-white rounded-xl">
            <ResizablePanelGroup direction="horizontal" className="items-stretch">
              <ResizablePanel defaultSize={66} minSize={40}>
                <div className="grid grid-cols-1 gap-6">
              {/* Left Column - Reading Text */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <h2 className="text-lg font-bold mb-4">1. OKUMA METNİ.</h2>
                  <p className="text-sm leading-relaxed mb-4">
                    Sorular 1-6. Aşağıdaki metni okuyunuz ve alttaki sözcükleri (A-H) kullanarak boşlukları (1-6)
                    doldurunuz. Her sözcük yalnızca bir defa kullanılabilir. Seçmemeniz gereken İKİ seçenek
                    bulunmaktadır.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-center font-bold text-lg">Takvimler</h3>

                  <div className="text-sm leading-relaxed space-y-4">
                    <p>
                      Batıl inançlar, bilimsel bir temele dayanmayan, ancak birçok insanın günlük yaşamında etkili olan
                      inanışlardır. Tarih boyunca insanlar, doğa olaylarını ve açıklayamadıkları durumları{" "}
                      <span className="inline-block w-20 mx-1"></span> (S1) güçlerle
                      ilişkilendirmişlerdir. Bu inançlar, nesilden nesle aktarılmış ve günümüzde bile varlığını
                      sürdürmektedir.
                    </p>

                    <p>
                      En yaygın batıl inançlardan biri, kara kedinin önünden geçmesinin{" "}
                      <span className="inline-block w-20 mx-1"></span> (S2) getireceğine
                      inanılmasıdır. Bunun kökeni Orta Çağ'a dayanır; o dönemde kara kedilerin cadılarla
                      ilişkilendirildiği düşünülürdü.
                    </p>

                    <p>
                      Batıl inançlar sadece kötü şansla ilgili değildir; bazıları iyi şans getirdiğine inanılan
                      ritüelleri de içerir. Örneğin, nazar boncuğu takmak, kişiyi kötü enerjilerden koruduğuna inanılan
                      yaygın bir gelenektir. Nazar inancı, eski Türk kültürüne dayansa da, günümüzde Türkiye'nin{" "}
                      <span className="inline-block w-20 mx-1"></span> (S3) birçok farklı
                      kültürde de yaygındır.
                    </p>

                    <p>
                      Batıl inançların insanlar üzerindeki etkisi oldukça{" "}
                      <span className="inline-block w-20 mx-1"></span> (S4). Özellikle önemli
                      kararlar alınırken ya da yeni bir işe başlanırken bu inançlar dikkate alınabilir.
                    </p>

                    <p>
                      Örneğin, yeni bir eve taşınmadan önce eve tuz dökmenin kötü ruhları uzaklaştıracağına inanılır.
                      Benzer şekilde, merdiven altından geçmenin kötü şans getirdiğine dair inanış da hâlâ birçok insan
                      tarafından dikkate alınmaktadır.
                    </p>

                    <p>
                      Günümüzde bilimin ilerlemesiyle batıl inançların{" "}
                      <span className="inline-block w-20 mx-1"></span> (S5) alanı azalmış
                      olsa da, bu <span className="inline-block w-20 mx-1"></span> (S6)
                      inançlar kültürel mirasın bir parçası olarak yaşamaya devam etmektedir.
                    </p>
                  </div>
                </div>
              </div>

              </div>
              </ResizablePanel>
              <ResizableHandle withHandle variant="grip" />
              <ResizablePanel defaultSize={34} minSize={25}>
              {/* Right Column - Answer Section */}
              <div className="space-y-6">
                {/* Answer Inputs */}
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <div key={num} className="flex items-center gap-3">
                      <span className="font-medium min-w-[2rem]">S{num}.</span>
                      <Select
                        value={answers[`S${num}` as keyof typeof answers]}
                        onValueChange={(v: string) => handleAnswerChange(`S${num}`, v)}
                      >
                        <SelectTrigger className="h-8 min-w-[10rem] rounded-full bg-transparent px-2 text-sm border-0 shadow-none focus:outline-none focus:ring-0">
                          <SelectValue placeholder={num === 1 ? "A) derin" : "Seçiniz"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg bg-white border-0 shadow-none">
                          {multipleChoiceOptions.map((option) => (
                            <SelectItem
                              key={option.letter}
                              value={option.text}
                              className="bg-white focus:bg-transparent data-[highlighted]:bg-transparent data-[state=checked]:bg-transparent"
                            >
                              {option.letter}) {option.text}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {/* Multiple Choice Options */}
                <div className="space-y-3 pt-6">
                  {multipleChoiceOptions.map((option) => (
                    <div
                      key={option.letter}
                      className="flex items-center gap-3 p-2 rounded"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold">
                        {option.letter}
                      </div>
                      <span className="text-sm">{option.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
      </div>

    </div>
  );
}
