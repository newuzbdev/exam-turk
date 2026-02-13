import { Button } from "@/components/ui/button";
import { ArrowRight, Target, Lightbulb, Users, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-16 sm:py-20 bg-gray-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Hakkımızda
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            TURKISHMOCK, Türkçe dil yeterlilik testlerinde lider yapay zekâ destekli sınav platformudur.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* Mission Section */}
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Misyonumuz</h2>
              <p className="text-gray-600 leading-relaxed">
                TURKISHMOCK olarak amacımız, Türkçe öğrenenlere ve yeterlilik testi arayanlara en doğru,
                hızlı ve erişilebilir çözümleri sunmaktır. CEFR standartlarına uyumlu testlerimizle,
                gerçek sınav deneyimini simüle ediyor ve anında detaylı geri bildirim sağlıyoruz.
              </p>
            </div>
          </div>
        </div>

        {/* What We Do Section */}
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Ne Yapıyoruz?</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Yapay zekâ destekli platformumuz sayesinde dört temel dil becerisini test ediyoruz:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="text-red-600 mr-2">•</span>
                  <span><strong>Dinleme:</strong> Gerçek hayat senaryolarıyla dinleme becerinizi ölçün</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2">•</span>
                  <span><strong>Okuma:</strong> Akademik ve günlük metinlerle okuma anlama becerinizi değerlendirin</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2">•</span>
                  <span><strong>Yazma:</strong> AI destekli değerlendirme ile yazma yeteneğinizi geliştirin</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2">•</span>
                  <span><strong>Konuşma:</strong> Konuşma becerinizi gerçek zamanlı olarak test edin</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Why Choose Us Section */}
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Neden TURKISHMOCK?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">CEFR Standartlarına Uyumlu</h3>
                <p className="text-gray-600 text-sm">
                  Testlerimiz Avrupa Dil Referans Çerçevesi (CEFR) standartlarına uygun olarak hazırlanmıştır.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Anında Sonuç ve Detaylı Analiz</h3>
                <p className="text-gray-600 text-sm">
                  Testi tamamladığınız anda puanınız, seviyeniz ve gelişim önerileriniz hazır olur.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Yapay Zekâ Destekli Değerlendirme</h3>
                <p className="text-gray-600 text-sm">
                  Yazma ve konuşma testleriniz gelişmiş AI algoritmaları ile değerlendirilir.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Kolay ve Hızlı Erişim</h3>
                <p className="text-gray-600 text-sm">
                  Herhangi bir yerden, herhangi bir zamanda teste başlayabilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Ekibimiz</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                TURKISHMOCK, deneyimli eğitmenler, yazılım geliştirici ve dil uzmanlarından oluşan
                bir ekip tarafından geliştirilmektedir.
              </p>
              <div className="space-y-3">
                <div className="border-l-2 border-red-600 pl-4">
                  <div className="font-semibold text-gray-900">Timur Makarov</div>
                  <div className="text-sm text-gray-600">Kurucu ve Lider</div>
                  <a
                    href="https://t.me/timur_makarov"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-red-600 hover:underline"
                  >
                    @timur_makarov
                  </a>
                </div>
                <div className="border-l-2 border-red-600 pl-4">
                  <div className="font-semibold text-gray-900">Ochilov Jahongirmirzo</div>
                  <div className="text-sm text-gray-600">Yazılım Geliştirici</div>
                  <a
                    href="https://t.me/new_uzb_dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-red-600 hover:underline"
                  >
                    @new_uzb_dev
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">İletişim</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                Sorularınız veya önerileriniz için bizimle iletişime geçebilirsiniz.
              </p>
              <a
                href="https://t.me/turkishmock"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-red-600 hover:text-red-700 font-medium"
              >
                Telegram: @turkishmock
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="border border-red-200 rounded-lg p-8 bg-gray-50 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Türkçe Seviyenizi Öğrenmeye Hazır mısınız?
          </h2>
          <p className="text-gray-600 mb-6 max-w-lg mx-auto">
            Hemen teste başlayın ve CEFR seviyenizi öğrenin.
          </p>
          <Button
            onClick={() => navigate("/test")}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 h-auto text-base font-semibold"
          >
            Teste Başla
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
