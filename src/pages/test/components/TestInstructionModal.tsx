import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Headphones, Mic, BookOpen, PenTool, Clock, Users } from "lucide-react";

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
        description:
          "IELTS Dinleme testi ses kayıtlarını dinleyerek soruları yanıtlama becerinizi ölçer.",
        instructions: [
          "Test süresince ses kayıtları sadece bir kez çalınır",
          "Her bölümde farklı konuşma türleri vardır (günlük konuşma, akademik sunum, vb.)",
          "Sorular ses kaydından önce okunabilir",
          "Cevaplarınızı dinlerken not alabilirsiniz",
          "Test sonunda cevap kağıdınızı doldurmak için ek süre verilir",
        ],
        tips: [
          "Önemli anahtar kelimeleri önceden okuyun",
          "Dinlerken not tutun",
          "Telaffuz ve aksan farklılıklarına dikkat edin",
        ],
      };
    case "speaking":
      return {
        title: "Konuşma Testi",
        icon: Mic,
        duration: "11-15 dakika",
        sections: "3 bölüm",
        description:
          "Konuşma testi İngilizce konuşma becerinizi değerlendirir. Her bölümde farklı görsel materyaller ve sorular sunulur.",
        instructions: [],
        tips: [],
      };
    case "reading":
      return {
        title: "Okuma Testi",
        icon: BookOpen,
        duration: "60 dakika",
        sections: "3 metin",
        description:
          "IELTS Okuma testi İngilizce okuma anlama becerinizi ölçer.",
        instructions: [
          "3 farklı metin üzerinde toplam 40 soru",
          "Metinler kitap, dergi, gazete ve akademik kaynaklardan alınır",
          "Soru türleri: çoktan seçmeli, doğru/yanlış, boşluk doldurma, eşleştirme",
          "Tüm cevaplar cevap kağıdına aktarılmalıdır",
          "Her yanlış cevap puan düşürür, tahmin etmekten kaçının",
        ],
        tips: [
          "Zamanınızı iyi yönetin",
          "Önce soruları okuyun, sonra metni tarayın",
          "Anahtar kelimeleri belirleyin",
        ],
      };
    case "writing":
      return {
        title: "Yazma Testi",
        icon: PenTool,
        duration: "60 dakika",
        sections: "2 görev",
        description:
          "IELTS Yazma testi İngilizce yazma becerinizi değerlendirir.",
        instructions: [
          "Görev 1: Grafik, tablo veya diyagram açıklama (150 kelime, 20 dakika)",
          "Görev 2: Essay yazma - verilen konuda görüşünüzü savunun (250 kelime, 40 dakika)",
          "Her iki görev de tamamlanmalıdır",
          "Kelime sayısı sınırlarına dikkat edin",
          "El yazısı ile yazılmalıdır (bu testte bilgisayar kullanımı)",
        ],
        tips: [
          "Zamanınızı görevlere göre ayırın",
          "Plan yapın, sonra yazın",
          "Gramer ve kelime çeşitliliği gösterin",
        ],
      };
    default:
      return {
        title: "Test",
        icon: BookOpen,
        duration: "Değişken",
        sections: "Çeşitli",
        description: "Test açıklaması mevcut değil.",
        instructions: [],
        tips: [],
      };
  }
};

const TestInstructionModal = ({
  open,
  onOpenChange,
  testType,
  onStartTest,
}: TestInstructionModalProps) => {
  const testInfo = getTestInstructions(testType);
  const IconComponent = testInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[90vw] max-h-[70vh] overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-100">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
            <div className="p-3 bg-red-600 rounded-lg">
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            <div>
              {testInfo.title}
              <p className="text-xs font-normal text-gray-600 mt-1">
                Test talimatlarını dikkatli okuyun
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Test Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-md">
              <Clock className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-xs text-red-600 font-bold uppercase">Süre</p>
                <p className="text-lg font-bold text-gray-900">
                  {testInfo.duration}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-md">
              <Users className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-xs text-red-600 font-bold uppercase">
                  Bölümler
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {testInfo.sections}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Test Hakkında
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {testInfo.description}
            </p>
          </div>

          {/* Instructions */}
          {testInfo.instructions.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Test Talimatları
              </h3>
              <div className="space-y-3">
                {testInfo.instructions.map((instruction, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {index + 1}
                      </span>
                    </div>
                    <span className="text-gray-700 leading-relaxed">
                      {instruction}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips removed as requested */}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 text-gray-700 border-gray-300 hover:bg-gray-50 font-bold"
            >
              İptal
            </Button>
            <Button
              size="lg"
              onClick={() => {
                onOpenChange(false);
                onStartTest();
              }}
              className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-bold"
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
