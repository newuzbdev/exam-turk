import { Button } from "@/components/ui/button";
import { Play, Sparkles, TrendingUp } from "lucide-react";

const ProfileNavigateTest = () => {
  return (
    <div>
      <section className="py-28 bg-gradient-to-r from-red-600 to-red-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center mb-6">
            <Sparkles className="h-6 w-6 mr-2 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Türkçe Seviyenizi Yükseltmeye Hazır mısınız?
          </h2>
          <p className="text-xl text-red-100 mb-8">
            Kişiselleştirilmiş testler ve detaylı analizlerle Türkçenizi
            geliştirin.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-red-600 hover:bg-gray-100 px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              Yeni Test Başlat
              <Play className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10 px-8 py-4 text-lg"
            >
              İlerleme Raporunu Görüntüle
              <TrendingUp className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProfileNavigateTest;
