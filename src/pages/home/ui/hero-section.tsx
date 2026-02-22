import { NavLink } from "react-router-dom";
import { ArrowRight, Headphones, BookOpen, Pencil, Mic } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type FeatureKey = "listening" | "reading" | "writing" | "speaking";

const HeroSection = () => {
  const [activeFeature, setActiveFeature] = useState<FeatureKey | null>(null);

  const features = [
    {
      key: "listening" as FeatureKey,
      title: "DİNLEME",
      desc: "Konuşmaları ve duyuruları doğru anlama.",
      image: "/dinleme.png",
      icon: Headphones,
      iconWrapClass: "border-gray-200 bg-gray-50",
      iconClass: "text-gray-700",
      demoTitle: "Dinleme Testi Önizlemesi",
    },
    {
      key: "reading" as FeatureKey,
      title: "OKUMA",
      desc: "Metinleri çözümleme ve çıkarım yapma.",
      image: "/okuma.png",
      icon: BookOpen,
      iconWrapClass: "border-gray-200 bg-gray-50",
      iconClass: "text-gray-700",
      demoTitle: "Okuma Testi Önizlemesi",
    },
    {
      key: "writing" as FeatureKey,
      title: "YAZMA",
      desc: "Tutarlı ve amaç odaklı metin yazma.",
      image: "/yazma.png",
      icon: Pencil,
      iconWrapClass: "border-gray-200 bg-gray-50",
      iconClass: "text-gray-700",
      demoTitle: "Yazma Testi Önizlemesi",
    },
    {
      key: "speaking" as FeatureKey,
      title: "KONUŞMA",
      desc: "Düşünceleri açık ve akıcı ifade etme.",
      image: "/konusma.png",
      icon: Mic,
      iconWrapClass: "border-gray-200 bg-gray-50",
      iconClass: "text-gray-700",
      demoTitle: "Konuşma Testi Önizlemesi",
    },
  ];

  const selectedFeature = features.find((f) => f.key === activeFeature) || features[0];

  return (
    <div className="relative bg-gray-100 antialiased font-sans">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(75,85,99,0.03),transparent_48%),radial-gradient(circle_at_85%_70%,rgba(107,114,128,0.035),transparent_46%),linear-gradient(180deg,rgba(229,231,235,0.08)_0%,rgba(243,244,246,0.06)_100%)]" />

      <section className="pt-10 sm:pt-14 pb-10 sm:pb-12 bg-white/92">
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
                Gerçek sınav deneyimi. Yapay zeka destekli değerlendirme.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
              <NavLink to="/test">
                <Button
                  size="lg"
                  className="theme-important group bg-red-600 hover:bg-red-700 text-white pl-7 pr-6 py-5 text-base sm:text-lg font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
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

      <section className="pb-12 sm:pb-14 bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((item, index) => (
              <Card
                key={item.key}
                onClick={() =>
                  setActiveFeature((prev) => (prev === item.key ? null : item.key))
                }
                className={`relative bg-white border rounded-2xl shadow-sm transition-shadow duration-300 hover:shadow-md group cursor-pointer overflow-hidden ${
                  activeFeature === item.key ? "border-red-300 ring-1 ring-red-200" : "border-gray-200 hover:border-gray-300"
                }`}
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

      {activeFeature && (
        <section className="pb-14 bg-white/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              <img
                src={selectedFeature.image}
                alt={`${selectedFeature.title} ekran görüntüsü`}
                className="h-auto w-full rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2"
                loading="lazy"
              />
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
                <iframe
                  className="aspect-video w-full"
                  src="https://www.youtube.com/embed/6rVFTG4dU8Q"
                  title="Anlatıcı Video"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
                <div className="border-t border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
                  Teste Giriş ve Bölüm Bazlı Arayüz Rehberi
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HeroSection;


