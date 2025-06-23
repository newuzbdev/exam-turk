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
  Users,
  Award,
  Star,
  ArrowRight,
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  Shield,
  TrendingUp,
  Globe,
  Sparkles,
} from "lucide-react";
import { NavLink } from "react-router";
import Navbar from "./components/navbar";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="pt-20 pb-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge
              variant="secondary"
              className="mb-8 bg-red-100 text-red-700 border-red-200 px-4 py-2"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Türkiye'nin En Güvenilir Dil Testi Platformu
            </Badge>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-8">
              Türkçe Dil
              <br />
              <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                Yeterlilik Testi
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-12 leading-relaxed">
              Profesyonel Türkçe dil seviyenizi ölçün. Dinleme, okuma, yazma ve
              konuşma becerilerinizi kapsamlı şekilde değerlendirin ve
              sertifikanızı alın.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <NavLink to="/test-selection">
                <Button
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Ücretsiz Teste Başla
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </NavLink>
              <Button
                variant="outline"
                size="lg"
                className="border-red-200 text-red-600 hover:bg-red-50 px-8 py-4 text-lg"
              >
                Demo İzle
              </Button>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-red-500" />
                <span>15,000+ aktif kullanıcı</span>
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-red-500" />
                <span>Güvenli ve sertifikalı</span>
              </div>
              <div className="flex items-center">
                <Globe className="h-4 w-4 mr-2 text-red-500" />
                <span>Uluslararası standartlar</span>
              </div>
            </div>
          </div>

          {/* Hero Cards */}
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="text-center border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                  <Headphones className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">Dinleme</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Türkçe dinleme becerinizi test edin
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">Okuma</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Metin anlama ve yorumlama
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                  <PenTool className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">Yazma</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Yazılı ifade becerinizi ölçün
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">Konuşma</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Sözlü ifade ve telaffuz</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                15,000+
              </div>
              <div className="text-gray-600">Aktif Kullanıcı</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                50,000+
              </div>
              <div className="text-gray-600">Tamamlanan Test</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                98%
              </div>
              <div className="text-gray-600">Memnuniyet Oranı</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                24/7
              </div>
              <div className="text-gray-600">Destek Hizmeti</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-red-100 text-red-700 border-red-200">
              <Award className="h-4 w-4 mr-2" />
              Özellikler
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Neden TürkTest?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Profesyonel Türkçe dil yeterlilik testinizi güvenilir ve kapsamlı
              platformumuzda gerçekleştirin
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Anında Sonuç
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Test tamamlandıktan hemen sonra detaylı performans raporunuzu
                görüntüleyin. Güçlü ve geliştirilmesi gereken alanlarınızı
                keşfedin.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Sertifikalı Sonuçlar
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Uluslararası standartlara uygun test sonuçlarınızı resmi
                sertifika ile belgelendirin. CV'nizde ve başvurularınızda
                kullanın.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                İlerleme Takibi
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Zaman içindeki gelişiminizi takip edin. Detaylı analitikler ile
                hangi alanlarda ilerleme kaydettiğinizi görün.
              </p>
            </div>
          </div>
        </div>
      </section>

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

          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">Temel</CardTitle>
                <div className="text-4xl font-bold text-gray-900 mt-4">₺0</div>
                <CardDescription className="text-lg mt-2">
                  Başlamak için ideal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>1 Tam Test</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Temel Puanlama</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Sınırlı Geri Bildirim</span>
                  </li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  Ücretsiz Başla
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-500 relative hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-600 text-white">
                En Popüler
              </Badge>
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">Profesyonel</CardTitle>
                <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mt-4">
                  ₺99
                  <span className="text-lg font-normal text-gray-600">/ay</span>
                </div>
                <CardDescription className="text-lg mt-2">
                  Kapsamlı değerlendirme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Sınırsız Test</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Detaylı Analitik</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Uzman Geri Bildirimi</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Sertifika</span>
                  </li>
                </ul>
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white shadow-lg">
                  Profesyonel Al
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">Kurumsal</CardTitle>
                <div className="text-4xl font-bold text-gray-900 mt-4">
                  ₺299
                  <span className="text-lg font-normal text-gray-600">/ay</span>
                </div>
                <CardDescription className="text-lg mt-2">
                  Kurumlar için
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
      <footer id="contact" className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-red-600 mb-4">
                TürkTest
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Türkçe dil yeterlilik seviyenizi belirlemek ve geliştirmek için
                profesyonel platform.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">
                Hızlı Bağlantılar
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li>
                  <NavLink
                    to="#"
                    className="hover:text-red-600 transition-colors"
                  >
                    Ana Sayfa
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#about"
                    className="hover:text-red-600 transition-colors"
                  >
                    Hakkımızda
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#features"
                    className="hover:text-red-600 transition-colors"
                  >
                    Özellikler
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#pricing"
                    className="hover:text-red-600 transition-colors"
                  >
                    Fiyatlar
                  </NavLink>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Test Türleri</h3>
              <ul className="space-y-3 text-gray-600">
                <li>
                  <NavLink
                    to="#"
                    className="hover:text-red-600 transition-colors"
                  >
                    Dinleme Testi
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#"
                    className="hover:text-red-600 transition-colors"
                  >
                    Okuma Testi
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#"
                    className="hover:text-red-600 transition-colors"
                  >
                    Yazma Testi
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#"
                    className="hover:text-red-600 transition-colors"
                  >
                    Konuşma Testi
                  </NavLink>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">İletişim</h3>
              <div className="text-gray-600 space-y-3">
                <p>destek@turktest.com</p>
                <p>+90 (212) 123-4567</p>
                <p>
                  Türkiye Caddesi No:123
                  <br />
                  İstanbul, Türkiye 34000
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-12 pt-8 text-center text-gray-500">
            <p>
              &copy; {new Date().getFullYear()} TürkTest. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
