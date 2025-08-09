import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Headphones, Mic, BookOpen, PenTool, Clock, Users, CheckCircle } from "lucide-react";

interface TestInstructionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testType: string;
  onStartTest: () => void;
}

const getTestInstructions = (testType: string) => {
  switch (testType.toLowerCase()) {
    case "listening":
      return {
        title: "Dinleme Testi",
        icon: Headphones,
        duration: "30 dakika",
        sections: "4 bölüm",
        description: "IELTS Dinleme testi ses kayıtlarını dinleyerek soruları yanıtlama becerinizi ölçer.",
        instructions: [
          "Test süresince ses kayıtları sadece bir kez çalınır",
          "Her bölümde farklı konuşma türleri vardır (günlük konuşma, akademik sunum, vb.)",
          "Sorular ses kaydından önce okunabilir",
          "Cevaplarınızı dinlerken not alabilirsiniz",
          "Test sonunda cevap kağıdınızı doldurmak için ek süre verilir"
        ],
        tips: [
          "Önemli anahtar kelimeleri önceden okuyun",
          "Dinlerken not tutun",
          "Telaffuz ve aksan farklılıklarına dikkat edin"
        ]
      };
    case "speaking":
      return {
        title: "Konuşma Testi",
        icon: Mic,
        duration: "11-15 dakika",
        sections: "3 bölüm",
        description: "IELTS Konuşma testi İngilizce konuşma becerinizi değerlendirir.",
        instructions: [
          "Bölüm 1: Tanışma ve genel sorular (4-5 dakika)",
          "Bölüm 2: Kısa sunum - size verilen konu hakkında 2 dakika konuşun (3-4 dakika)",
          "Bölüm 3: Detaylı tartışma - Bölüm 2'nin konusuyla ilgili derin sorular (4-5 dakika)",
          "Tüm konuşmalar kaydedilir",
          "Doğal ve akıcı konuşmaya odaklanın"
        ],
        tips: [
          "Açık ve net konuşun",
          "Örnekler vererek cevaplarınızı geliştirin",
          "Gramer çeşitliliği kullanın"
        ]
      };
    case "reading":
      return {
        title: "Okuma Testi",
        icon: BookOpen,
        duration: "60 dakika",
        sections: "3 metin",
        description: "IELTS Okuma testi İngilizce okuma anlama becerinizi ölçer.",
        instructions: [
          "3 farklı metin üzerinde toplam 40 soru",
          "Metinler kitap, dergi, gazete ve akademik kaynaklardan alınır",
          "Soru türleri: çoktan seçmeli, doğru/yanlış, boşluk doldurma, eşleştirme",
          "Tüm cevaplar cevap kağıdına aktarılmalıdır",
          "Her yanlış cevap puan düşürür, tahmin etmekten kaçının"
        ],
        tips: [
          "Zamanınızı iyi yönetin",
          "Önce soruları okuyun, sonra metni tarayın",
          "Anahtar kelimeleri belirleyin"
        ]
      };
    case "writing":
      return {
        title: "Yazma Testi",
        icon: PenTool,
        duration: "60 dakika",
        sections: "2 görev",
        description: "IELTS Yazma testi İngilizce yazma becerinizi değerlendirir.",
        instructions: [
          "Görev 1: Grafik, tablo veya diyagram açıklama (150 kelime, 20 dakika)",
          "Görev 2: Essay yazma - verilen konuda görüşünüzü savunun (250 kelime, 40 dakika)",
          "Her iki görev de tamamlanmalıdır",
          "Kelime sayısı sınırlarına dikkat edin",
          "El yazısı ile yazılmalıdır (bu testte bilgisayar kullanımı)"
        ],
        tips: [
          "Zamanınızı görevlere göre ayırın",
          "Plan yapın, sonra yazın",
          "Gramer ve kelime çeşitliliği gösterin"
        ]
      };
    default:
      return {
        title: "Test",
        icon: BookOpen,
        duration: "Değişken",
        sections: "Çeşitli",
        description: "Test açıklaması mevcut değil.",
        instructions: [],
        tips: []
      };
  }
};

const TestInstructionModal = ({ open, onOpenChange, testType, onStartTest }: TestInstructionModalProps) => {
  const testInfo = getTestInstructions(testType);
  const IconComponent = testInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-gray-100 rounded-lg">
              <IconComponent className="h-6 w-6 text-gray-700" />
            </div>
            {testInfo.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Test Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">Süre: {testInfo.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">{testInfo.sections}</span>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-700">{testInfo.description}</p>
          </div>

          {/* Instructions */}
          {testInfo.instructions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Test Talimatları</h3>
              <div className="space-y-2">
                {testInfo.instructions.map((instruction, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{instruction}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {testInfo.tips.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">İpuçları</h3>
              <div className="grid gap-2">
                {testInfo.tips.map((tip, index) => (
                  <Badge key={index} variant="outline" className="justify-start p-2 h-auto">
                    💡 {tip}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              İptal
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                onStartTest();
              }}
              className="flex-1 bg-gray-700 hover:bg-gray-800"
            >
              Teste Başla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestInstructionModal;
