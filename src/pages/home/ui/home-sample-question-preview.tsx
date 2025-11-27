import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Headphones, BookOpen, PenTool, Mic } from "lucide-react";

const HomeSampleQuestionPreview = () => {
  return (
    <div>
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-red-100 text-red-700 border-red-200">
              Örnek Sorular
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Testten Örnek Soru Görünümleri
            </h2>
            <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto">
              Teste başlamadan önce dinleme, okuma, yazma ve konuşma bölümlerinin
              nasıl göründüğünü keşfedin.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            <Card className="border-red-100 hover:border-red-200 hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                  <Headphones className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Dinleme
                  </span>
                </div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  Kısa Diyalog Dinleme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full w-2/3 bg-gradient-to-r from-red-500 to-red-400" />
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Soru:
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Konuşmada bahsedilen adam ne yapmak istiyor?
                </p>
                <ul className="mt-1 space-y-1 text-sm text-gray-600">
                  <li>A) Tatil planı yapmak</li>
                  <li>B) Yeni bir telefon almak</li>
                  <li>C) Arkadaşını aramak</li>
                  <li>D) Ev taşımak</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-red-100 hover:border-red-200 hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Okuma
                  </span>
                </div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  Kısa Metin Anlama
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Metin:
                </p>
                <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">
                  Her sabah saat yedide uyanıyorum. Önce kahvaltı yapıyorum,
                  sonra işe gitmek için otobüse biniyorum. Akşamları genellikle
                  kitap okuyorum veya film izliyorum.
                </p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Soru:
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Bu kişi akşamları genellikle ne yapıyor?
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-100 hover:border-red-200 hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                  <PenTool className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Yazma
                  </span>
                </div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  Kısa Paragraf Yazma
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Görev:
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  &quot;Günlük hayatınızda en çok hangi teknolojik aleti
                  kullanıyorsunuz? Neden?&quot; konulu en az 80 kelimelik bir
                  paragraf yazınız.
                </p>
                <div className="mt-2 h-14 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                  Cevabınız buraya yazılacak...
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-100 hover:border-red-200 hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                  <Mic className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Konuşma
                  </span>
                </div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  Kayıtlı Konuşma Görevi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Soru:
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Son tatilinizi anlatın. Nereye gittiniz? Kiminle gittiniz ve
                  orada neler yaptınız?
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                    <Mic className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full w-1/2 bg-gradient-to-r from-red-500 to-red-400" />
                  </div>
                  <span className="text-xs text-gray-500">00:45</span>
                </div>
                <p className="text-xs text-gray-500">
                  * Bu sadece görsel bir örnektir, gerçek test sırasında sesiniz
                  kaydedilir.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeSampleQuestionPreview;





