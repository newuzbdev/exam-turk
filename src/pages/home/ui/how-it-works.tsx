import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

const HowItWorks = () => {
  return (
    <div>
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-red-100 text-red-700 border-red-200">
              <Sparkles className="h-4 w-4 mr-2" />
              Süreç
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Nasıl Çalışır?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Sadece üç basit adımda Türkçe dil seviyenizi öğrenin
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-yellow-800" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Test Seçin
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Dinleme, okuma, yazma veya konuşma testlerinden birini seçin.
                Tam değerlendirme için dört testin tamamını alabilirsiniz.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-yellow-800" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Testi Tamamlayın
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Gerçek sınav ortamını simüle eden platformumuzda testinizi
                tamamlayın. Süre takibi ve ilerleme çubuğu ile kendinizi takip
                edin.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-yellow-800" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Sonuçları Alın
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Anında puanlama ile seviyenizi öğrenin. Detaylı rapor ve gelişim
                önerileri ile Türkçenizi geliştirin.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;

