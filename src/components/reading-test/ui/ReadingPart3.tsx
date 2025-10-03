"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReadingPart3() {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const headings = [
    { id: "A", text: "Özbekistan’da Olimpiyat Ruhunun Modern Spor Üzerindeki Etkileri" },
    { id: "B", text: "Paris 2024’te Sürdürülebilirlik Projelerinin Rolü" },
    { id: "C", text: "Yeni Kuşağı Meraklandıran Spor Dalları" },
    { id: "D", text: "Genç Sporcuların Olimpik Başarı Dinamikleri" },
    { id: "E", text: "Sunulan Yeni Olanaklar" },
    { id: "F", text: "Sporun Toplumlararası İlişkilere Etkisi" },
    { id: "G", text: "Özbekistan’ın Paris 2024’teki Hedefleri" },
    { id: "H", text: "Yenilikçi Olimpiyat Stratejileri" },
  ];

  const paragraphs: Array<{ key: string; label: string; text: string }> = [
    {
      key: "S15",
      label: "S15. I. paragraf",
      text:
        "Paris 2024 Olimpiyat Oyunları, modern olimpiyat tarihinin en önemli etkinliklerinden biri olarak kabul ediliyor. Bu oyunlar, Paris’in üçüncü kez ev sahipliği yaptığı oyunlar olarak tarihe geçecek. Ancak Paris 2024, sadece tarihi bir olay olmanın ötesinde, yenilikçi yaklaşımları ve çevre dostu projeleriyle de dikkat çekiyor. Sürdürülebilirlik, oyunların merkezinde yer alıyor ve kullanılan malzemelerin büyük çoğunluğu geri dönüştürülebilir olacak şekilde tasarlandı. Olimpiyat Köyü, enerji verimliliği göz önünde bulundurularak inşa edildi ve oyunlar sırasında çevreye verilen zararın minimuma indirgenmesi hedeflendi. Paris 2024, bu anlamda sadece bir spor etkinliği değil, aynı zamanda gelecekteki uluslararası organizasyonlara örnek teşkil edecek bir model olarak da görülüyor.",
    },
    {
      key: "S16",
      label: "S16. II. paragraf",
      text:
        "Paris 2024’te tanıtılan yenilikçi teknolojiler, spor deneyimini izleyiciler için daha etkileşimli hale getiriyor. Akıllı biletleme, artırılmış gerçeklik ve canlı veri panoları, seyircilerin müsabakalara anlık erişim sağlamasına yardımcı oluyor.",
    },
    {
      key: "S17",
      label: "S17. III. paragraf",
      text:
        "Genç sporcular için oluşturulan destek programları, performans takibi ve psikolojik danışmanlık gibi hizmetlerle olimpik başarıyı artırmayı hedefliyor. Bu programlar, yeni kuşağın sporla bağını güçlendiriyor.",
    },
    {
      key: "S18",
      label: "S18. IV. paragraf",
      text:
        "Paris, oyunlar kapsamında düzenlediği kültürel etkinliklerle farklı toplumlar arasında köprü kurmayı amaçlıyor. Sporun birleştirici gücü, uluslararası işbirliği ve anlayışı destekliyor.",
    },
    {
      key: "S19",
      label: "S19. V. paragraf",
      text:
        "Şehir içi ulaşımda çevreci çözümler ön plana çıkarılıyor. Bisiklet yolları genişletildi, elektrikli toplu taşıma araçları yaygınlaştırıldı ve gönüllüler için özel servisler planlandı.",
    },
    {
      key: "S20",
      label: "S20. VI. paragraf",
      text:
        "Orta Asya’dan katılan ekipler arasında Özbekistan, genç ve dinamik kadrosuyla dikkat çekiyor. Paris 2024 için belirlenen hedefler, belirli branşlarda finale kalmak ve rekorları zorlamak üzerine kurulu.",
    },
  ];

  return (
    <div className="p-4 md:p-6 bg-white rounded-xl mx-auto  mt-4 mb-4">
      <ResizablePanelGroup direction="horizontal" className="items-stretch">
        <ResizablePanel defaultSize={66} minSize={40}>
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-4">3. OKUMA METNİ.</h2>
              <p className="text-sm leading-relaxed mb-6">
                Sorular 15-20. Aşağıdaki başlıkları (A-H) ve paragrafları (15-20) okuyunuz. Her paragraf için uygun
                başlığı seçiniz. Her başlık yalnız bir defa kullanılabilir.
              </p>
            </div>

            <div className="space-y-6">
              {paragraphs.map((p) => (
                <div key={p.key} className="space-y-3">
                  <div className="space-y-2">
                    <span className="font-bold block">{p.label}</span>
                    <Select
                      value={answers[p.key] ?? ""}
                      onValueChange={(val) => setAnswers((prev) => ({ ...prev, [p.key]: val }))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="Seçiniz" />
                      </SelectTrigger>
                      <SelectContent>
                        {headings.map((h) => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Card className="p-4 bg-gray-50">
                    <p className="text-sm leading-relaxed">{p.text}</p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle variant="grip" />

        <ResizablePanel defaultSize={34} minSize={25}>
          <div className="space-y-3">
            {headings.map((h) => (
              <div key={h.id} className="flex items-start gap-3 p-2 rounded">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1 border">
                  {h.id}
                </div>
                <span className="text-sm leading-relaxed">{h.text}</span>
              </div>
            ))}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

