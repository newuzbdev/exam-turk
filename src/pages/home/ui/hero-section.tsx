import { NavLink } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Pencil,
  Headphones,
  Mic,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  const features = [
    {
      title: "DİNLEME",
      desc: "Konuşmaları ve duyuruları doğru anlama.",
      icon: Headphones,
    },
    {
      title: "OKUMA",
      desc: "Metinleri çözümleme ve çıkarım yapma.",
      icon: BookOpen,
    },
    {
      title: "YAZMA",
      desc: "Tutarlı ve amaç odaklı metin yazma.",
      icon: Pencil,
    },
    {
      title: "KONUŞMA",
      desc: "Düşünceleri açık ve akıcı ifade etme.",
      icon: Mic,
    },
  ];

  return (
    <div className="antialiased">

      {/* Hero Üst Kısım (Beyaz Arka Plan) */}
      <section className="pt-8 sm:pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">

          <div className="mb-10 space-y-6">
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-50 border border-gray-200 rounded-full">
                <span className="text-xs sm:text-sm text-gray-600 font-medium">
                  CEFR Standartlarına Uyumlu
                </span>
              </div>
            </div>

            <div className="space-y-4 max-w-4xl mx-auto">
              <h1 className="text-5xl sm:text-7xl leading-[1.1] tracking-tight text-gray-900">
                <span className="block font-semibold">TÜRKÇE SEVİYENİZİ</span>
                <span className="block font-extrabold text-red-600 mt-2">HEMEN ÖĞRENİN</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto font-normal mt-4">
                Gerçek sınav deneyimi. Yapay zekâ destekli değerlendirme.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
              <NavLink to="/test">
                <Button
                  size="lg"
                  className="group bg-red-600 hover:bg-red-700 text-white pl-8 pr-6 py-6 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  Teste Başla
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
                </Button>
              </NavLink>

              <NavLink to="/how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-8 py-6 text-lg font-medium rounded-full transition-colors duration-300"
                >
                  Nasıl Çalışır?
                </Button>
              </NavLink>
            </div>
          </div>
        </div>
      </section>

      {/* Kartlar Bölümü (Gri Arka Plan) */}
      <section className="pb-18 border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((item, index) => (
              <Card
                key={index}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm transition-all duration-500 ease-in-out group hover:border-red-200 hover:shadow-xl hover:-translate-y-2 cursor-default overflow-hidden"
              >
                <CardContent className="p-8">
                  <div className="flex flex-col items-start text-left space-y-6">
                    {/* İKON ALANI */}
                    <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 border border-transparent
                                    bg-red-600 text-white
                                    group-hover:bg-white group-hover:text-red-600 group-hover:border-red-600 group-hover:scale-110">
                      <item.icon className="h-7 w-7" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-extrabold text-gray-900 tracking-wide uppercase group-hover:text-red-600 transition-colors duration-300">
                        {item.title}
                      </h3>
                      <p className="text-[13px] text-gray-500 leading-relaxed font-medium">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;
