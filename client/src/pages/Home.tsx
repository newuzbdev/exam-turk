import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Star,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { NavLink } from "react-router";
import HeroSection from "@/components/hero-section";
import StatsSection from "@/components/stats-section";
import FeaturedSection from "@/components/featured-section";

export default function Home() {
  return (
    <div className=" bg-white">
      <HeroSection />

      <StatsSection />

      <FeaturedSection />

      {/* How it Works */}
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

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-red-100 text-red-700 border-red-200">
              <Star className="h-4 w-4 mr-2" />
              Yorumlar
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Kullanıcı Deneyimleri
            </h2>
            <p className="text-xl text-gray-600">
              Binlerce kullanıcının güvendiği platform
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="border-red-100 hover:border-red-200 hover:shadow-xl transition-all duration-300 group">
              <CardContent className="pt-8">
                <div className="flex mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <blockquote className="text-gray-700 mb-6 leading-relaxed">
                  "TürkTest sayesinde Türkçe seviyemi doğru şekilde belirledim.
                  Test sonuçları çok detaylı ve profesyonel. Kesinlikle tavsiye
                  ederim."
                </blockquote>
                <div className="border-t border-red-100 pt-4">
                  <div className="font-semibold text-gray-900">
                    Ahmet Yılmaz
                  </div>
                  <div className="text-sm text-red-600">
                    Öğretmen • Türkçe Seviye: B2
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-100 hover:border-red-200 hover:shadow-xl transition-all duration-300 group">
              <CardContent className="pt-8">
                <div className="flex mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <blockquote className="text-gray-700 mb-6 leading-relaxed">
                  "Konuşma testi özellikle çok başarılı. Telaffuzumu geliştirmek
                  için aldığım geri bildirimler çok faydalı oldu."
                </blockquote>
                <div className="border-t border-red-100 pt-4">
                  <div className="font-semibold text-gray-900">Fatma Demir</div>
                  <div className="text-sm text-red-600">
                    Mühendis • Türkçe Seviye: C1
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-100 hover:border-red-200 hover:shadow-xl transition-all duration-300 group">
              <CardContent className="pt-8">
                <div className="flex mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <blockquote className="text-gray-700 mb-6 leading-relaxed">
                  "Kullanıcı dostu arayüz ve kapsamlı test içeriği. Türkçe
                  öğrenmek isteyenlere kesinlikle tavsiye ederim."
                </blockquote>
                <div className="border-t border-red-100 pt-4">
                  <div className="font-semibold text-gray-900">
                    Mehmet Özkan
                  </div>
                  <div className="text-sm text-red-600">
                    Öğrenci • Türkçe Seviye: A2
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-red-100 text-red-700 border-red-200">
              <TrendingUp className="h-4 w-4 mr-2" />
              Fiyatlar
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Fiyat Planları
            </h2>
            <p className="text-xl text-gray-600">
              İhtiyacınıza uygun planı seçin
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <Card className="relative border-2 border-gray-200 hover:border-red-300 transition-colors">
              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-xl font-bold">
                  Başlangıç Deneme
                </CardTitle>
                <CardDescription className="text-sm">
                  Platformumuzu deneyimlemek isteyen yeni kullanıcılar için
                  mükemmel
                </CardDescription>
              </CardHeader>

              <CardContent className="text-center">
                <div className="mb-4">
                  <span className="text-sm text-gray-600">Birim dahil: </span>
                  <span className="text-lg font-bold text-yellow-600">8U</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  Ücretsiz
                </div>
                <p className="text-sm text-gray-600">
                  İlk kayıt olduğunuzda bonus birimler kazanın
                </p>
                <NavLink to="/price">
                  <Button className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white">
                    Ücretsiz Bonusu Al
                  </Button>
                </NavLink>
              </CardContent>
            </Card>

            <Card className="relative border-2 border-gray-200 hover:border-red-300 transition-colors">
              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>

                <CardTitle className="text-xl font-bold">
                  Hızlı Değerlendirme
                </CardTitle>
                <CardDescription className="text-sm">
                  Hedefli pratik testlerle tahmini puanınızı alın
                </CardDescription>
              </CardHeader>

              <CardContent className="text-center">
                <div className="mb-4">
                  <span className="text-sm text-gray-600">Birim dahil: </span>
                  <span className="text-lg font-bold text-yellow-600">15U</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  25.000 TL
                </div>
                <p className="text-sm text-gray-600">
                  Bir kapsamlı sınav veya birden fazla odaklı bölüm için ideal
                </p>
                <NavLink to="/price">
                  <Button className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white">
                    15U Paketi Satın Al
                  </Button>
                </NavLink>
              </CardContent>
            </Card>

            <Card className="relative border-2 border-red-300 hover:border-red-400 transition-colors">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-600 text-white">
                En Popüler
              </Badge>
              <CardHeader className="text-center pb-4 pt-6">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>

                <CardTitle className="text-xl font-bold">
                  Yoğun Hazırlık ⚡
                </CardTitle>
                <CardDescription className="text-sm">
                  6-8 tam sınav veya odaklı beceri pratiği için mükemmel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Profesyonel'deki Her Şey</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Ekip Yönetimi</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Özel Raporlama</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Öncelikli Destek</span>
                  </li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  İletişime Geç
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-red-600 to-red-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Türkçe Seviyenizi Öğrenmeye Hazır mısınız?
          </h2>
          <p className="text-xl text-red-100 mb-12">
            Binlerce kullanıcının güvendiği platformda Türkçe dil yeterlilik
            testinizi hemen başlatın.
          </p>
          <NavLink to="/test-selection">
            <Button
              size="lg"
              className="bg-white text-red-600 hover:bg-gray-100 px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              Ücretsiz Teste Başla
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </NavLink>
        </div>
      </section>

      {/* Footer */}
    </div>
  );
}
