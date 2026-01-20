import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Briefcase, Home, Building2 } from "lucide-react";

const HomeWhoIsFor = () => {
  return (
    <div>
      <section className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-red-100 text-red-700 border-red-200">
              Kimler İçin?
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Kimler İçin Uygun?
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              TürkTest, farklı hedefleri olan kullanıcılar için tasarlanmış
              kapsamlı bir Türkçe seviye belirleme platformudur.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <Card className="h-full border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Öğrenciler ve Adaylar
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 leading-relaxed">
                Üniversiteye hazırlanan, TÖMER / TYS gibi sınavlara girecek veya
                burs başvurusu yapacak adaylar için gerçek sınava yakın Türkçe
                seviye tespiti.
              </CardContent>
            </Card>

            <Card className="h-full border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Profesyoneller
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 leading-relaxed">
                Türkiye&apos;de kariyer hedefleyen yabancı profesyoneller için;
                iş görüşmesi, sunum ve iş ortamında gerekli Türkçe dil
                yeterliliğini ölçmek isteyenler.
              </CardContent>
            </Card>

            <Card className="h-full border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Home className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Türkiye&apos;de Yaşayanlar
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 leading-relaxed">
                Günlük yaşamda daha akıcı Türkçe konuşmak, resmi işlemleri
                rahatça halletmek ve sosyal hayatta daha özgüvenli olmak
                isteyenler.
              </CardContent>
            </Card>

            <Card className="h-full border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Kurumlar ve Dil Kursları
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 leading-relaxed">
                Öğrencilerinin veya çalışanlarının Türkçe seviyesini standart
                bir ölçümle belirlemek isteyen okullar, dil kursları ve
                şirketler.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeWhoIsFor;









