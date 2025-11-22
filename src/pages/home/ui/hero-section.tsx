import { NavLink } from "react-router";
import {
  ArrowRight,
  BookOpen,
  Globe,
  Headphones,
  Mic,
  PenTool,
  Shield,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <div>
      <section className="min-h-screen flex items-center bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="text-center mb-8 sm:mb-12">
            {/* <Badge
              variant="secondary"
              className="mb-4 sm:mb-6 bg-red-100 text-red-700 border-red-200 px-3 sm:px-4 py-1.5 sm:py-2 text-base sm:text-lg"
            >
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Türkiye'nin En Güvenilir Dil Testi Platformu
            </Badge> */}

            <h1 className="text-4xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4 sm:mb-6">
              Türkçe Dil
              <br />
              <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                Yeterlilik Testi
              </span>
            </h1>

            <p className="text-lg sm:text-lg md:text-xl text-gray-600 max-w-4xl mx-auto mb-6 sm:mb-8 leading-relaxed">
              Profesyonel Türkçe dil seviyenizi ölçün. Dinleme, okuma, yazma ve
              konuşma becerilerinizi kapsamlı şekilde değerlendirin ve
              sertifikanızı alın.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-10">
              <NavLink to="/test">
                <Button
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 sm:py-3 text-lg sm:text-xl shadow-lg w-full sm:w-auto"
                >
                   Teste Başla
                  <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </NavLink>
              <Button
                variant="outline"
                size="lg"
                className="border-red-200 text-red-600 hover:bg-red-50 px-4 sm:px-6 py-2 sm:py-3 text-lg sm:text-xl w-full sm:w-auto"
              >
                Demo İzle
              </Button>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-sm sm:text-base text-gray-500 mb-8 sm:mb-12">
              <div className="flex items-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-red-500" />
                <span className="text-lg sm:text-xl">
                  15,000+ aktif kullanıcı
                </span>
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-red-500" />
                <span className="text-lg sm:text-xl">
                  Güvenli ve sertifikalı
                </span>
              </div>
              <div className="flex items-center">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-red-500" />
                <span className="text-lg sm:text-xl">
                  Uluslararası standartlar
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-10 max-w-6xl mx-auto">
              <Card className="text-center border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
                <CardHeader className="pb-2 sm:pb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-200">
                    <Headphones className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">Dinleme</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm sm:text-base text-gray-600">
                    Türkçe dinleme becerinizi test edin
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
                <CardHeader className="pb-2 sm:pb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-200">
                    <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">Okuma</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm sm:text-base text-gray-600">
                    Metin anlama ve yorumlama
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
                <CardHeader className="pb-2 sm:pb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-200">
                    <PenTool className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">Yazma</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm sm:text-base text-gray-600">
                    Yazılı ifade becerinizi ölçün
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
                <CardHeader className="pb-2 sm:pb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-200">
                    <Mic className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">Konuşma</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm sm:text-base text-gray-600">
                    Sözlü ifade ve telaffuz
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
export default HeroSection;
