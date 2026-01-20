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
      <section className="min-h-screen flex items-center bg-gradient-to-b from-gray-100 via-gray-50 to-white relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 right-20 w-72 h-72 bg-red-100 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-50 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 relative z-10">
          <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6 tracking-tight">
  TÜRKÇE SEVİYENİZİ
  <br />
  <span className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent">
    HEMEN ÖĞRENIN
  </span>
</h1>

            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
              Gerçek sınav deneyimi. Yapay zekâ destekli değerlendirme.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <NavLink to="/test">
                <Button
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl w-full sm:w-auto rounded-lg"
                >
                  Teste Başla
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </NavLink>
              <NavLink to="/how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg font-medium w-full sm:w-auto rounded-lg"
                >
                  Nasıl Çalışır
                </Button>
              </NavLink>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 text-gray-600 mb-16">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-red-600" />
                </div>
                <span className="text-base sm:text-lg font-medium">
                  1.500+ Aktif Kullanıcı
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <span className="text-base sm:text-lg font-medium">
                  Güvenli Platform
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <Globe className="h-5 w-5 text-red-600" />
                </div>
                <span className="text-base sm:text-lg font-medium">
                  Uluslararası Standart
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <Card className="text-center bg-white border border-gray-100 hover:border-red-100 card-hover group">
                <CardHeader className="pb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Headphones className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Dinleme</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Konuşmaları ve duyuruları doğru anlama
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center bg-white border border-gray-100 hover:border-red-100 card-hover group">
                <CardHeader className="pb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <BookOpen className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Okuma</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Metinleri çözümleme ve çıkarım yapma
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center bg-white border border-gray-100 hover:border-red-100 card-hover group">
                <CardHeader className="pb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <PenTool className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Yazma</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Tutarlı ve amaç odaklı metin yazma
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center bg-white border border-gray-100 hover:border-red-100 card-hover group">
                <CardHeader className="pb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Mic className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Konuşma</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Düşünceleri açık ve akıcı ifade etme
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


