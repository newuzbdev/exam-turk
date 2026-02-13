import { NavLink } from "react-router-dom";
import { ArrowRight, Headphones, BookOpen, Pencil, Mic } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  const features = [
    {
      title: "DİNLEME",
      desc: "Konuşmaları ve duyuruları doğru anlama.",
      icon: Headphones,
      iconWrapClass: "border-gray-200 bg-gray-50",
      iconClass: "text-gray-700",
    },
    {
      title: "OKUMA",
      desc: "Metinleri çözümleme ve çıkarım yapma.",
      icon: BookOpen,
      iconWrapClass: "border-gray-200 bg-gray-50",
      iconClass: "text-gray-700",
    },
    {
      title: "YAZMA",
      desc: "Tutarlı ve amaç odaklı metin yazma.",
      icon: Pencil,
      iconWrapClass: "border-gray-200 bg-gray-50",
      iconClass: "text-gray-700",
    },
    {
      title: "KONUŞMA",
      desc: "Düşünceleri açık ve akıcı ifade etme.",
      icon: Mic,
      iconWrapClass: "border-gray-200 bg-gray-50",
      iconClass: "text-gray-700",
    },
  ];

  return (
    <div className="antialiased font-sans">
      {/* Hero Üst Kısım (Beyaz Arka Plan) */}
      <section className="pt-10 sm:pt-14 pb-10 sm:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
          <div className="mb-8 space-y-5">
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 rounded-full">
                <span className="text-xs sm:text-sm text-gray-600 font-medium">
                  CEFR Standartlarına Uyumlu
                </span>
              </div>
            </div>

            <div className="space-y-4 max-w-4xl mx-auto">
              <h1 className="text-4xl sm:text-6xl leading-[1.08] tracking-tight text-gray-900">
                <span className="block font-bold text-gray-900">TÜRKÇE SEVİYENİ</span>
                <span className="block font-bold text-red-600 mt-2">HEMEN ÖĞREN</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto font-normal mt-4">
                Gerçek sınav deneyimi. Yapay zekâ destekli değerlendirme.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
              <NavLink to="/test">
                <Button
                  size="lg"
                  className="group bg-red-600 hover:bg-red-700 text-white pl-7 pr-6 py-5 text-base sm:text-lg font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                >
                  Teste Başla
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </NavLink>

              <NavLink to="/how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-8 py-5 text-base sm:text-lg font-medium rounded-xl transition-colors duration-300"
                >
                  Nasıl Çalışır?
                </Button>
              </NavLink>
            </div>
          </div>
        </div>
      </section>

      {/* Kartlar Bölümü (Gri Arka Plan) */}
      <section className="pb-12 sm:pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((item, index) => (
              <Card
                key={index}
                className="relative bg-white border border-gray-200 rounded-2xl shadow-sm transition-shadow duration-300 hover:shadow-md hover:border-gray-300 group cursor-pointer overflow-hidden"
                style={{
                  opacity: 0,
                  animation: "fadeInUp 0.75s ease-out forwards",
                  animationDelay: `${80 + index * 120}ms`,
                }}
              >
                <CardContent className="p-7">
                  <div className="flex flex-col items-start text-left space-y-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors duration-300 group-hover:bg-red-600 group-hover:border-red-600 ${item.iconWrapClass}`}>
                      <item.icon className={`h-6 w-6 transition-colors duration-300 group-hover:text-white ${item.iconClass}`} />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-gray-900 tracking-wide uppercase transition-colors duration-300">
                        {item.title}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
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


