import { NavLink } from "react-router-dom";
import {
  Coins,
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Award,
  Zap,
  Target,
  TrendingUp,
  CreditCard,
  Layout,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

const HowItWorksPage = () => {
  return (
    <div className="bg-white text-gray-900 min-h-screen font-sans">
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-50 border border-red-100 rounded-full mb-8">
            <span className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
            <span className="text-sm text-red-700 font-bold tracking-wide uppercase">
              Başlangıç Rehberi
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight">
            Süreç Nasıl <span className="text-red-600">İşliyor?</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto font-normal leading-relaxed">
            TURKISHMOCK platformunu kullanarak Türkçe seviyenizi öğrenmek için gereken tüm adımlar. Karmaşık prosedürler yok, sadece sonuç var.
          </p>
        </div>
      </section>

      {/* Steps Container */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          {/* STEP 1: Bakiye Yükleme */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 shadow-sm hover:shadow-xl transition-all duration-300 group">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 font-bold text-2xl border border-red-100 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                  1
                </div>
              </div>
              <div className="flex-grow">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  Bakiye Yükleme
                  <CreditCard className="w-6 h-6 text-gray-400" />
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Sınavlara girmek için öncelikle hesabınıza bakiye yüklemeniz gerekir. Güvenli ödeme altyapımız ile saniyeler içinde işleminizi tamamlayabilirsiniz.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <CheckCircle2 className="w-5 h-5 text-red-600 mt-0.5" />
                    <span className="text-sm text-gray-700 font-medium">Sağ üst köşedeki bakiye kutusuna tıklayın.</span>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <CheckCircle2 className="w-5 h-5 text-red-600 mt-0.5" />
                    <span className="text-sm text-gray-700 font-medium">Yüklemek istediğiniz tutarı girin (Min: 1.000 UZS).</span>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <CheckCircle2 className="w-5 h-5 text-red-600 mt-0.5" />
                    <span className="text-sm text-gray-700 font-medium">Payme ile güvenli ödemeyi tamamlayın.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Kredi Satın Alma */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 shadow-sm hover:shadow-xl transition-all duration-300 group">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 font-bold text-2xl border border-red-100 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                  2
                </div>
              </div>
              <div className="flex-grow">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  Kredi Satın Alma
                  <Coins className="w-6 h-6 text-gray-400" />
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Yüklediğiniz bakiyeyi "Kredi"ye çevirerek avantajlı paketlerden yararlanın. Her sınav bölümü belirli bir kredi karşılığında açılır.
                </p>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-bold text-blue-900 mb-1">Kredi Maliyetleri</h4>
                      <p className="text-sm text-blue-800 mb-3">
                        Bakiyenizi verimli kullanmak için ihtiyacınız olan modülleri seçin.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-white text-blue-700 px-3 py-1 rounded-md text-xs font-bold border border-blue-100">Okuma: 2 Kredi</span>
                        <span className="bg-white text-blue-700 px-3 py-1 rounded-md text-xs font-bold border border-blue-100">Dinleme: 2 Kredi</span>
                        <span className="bg-white text-blue-700 px-3 py-1 rounded-md text-xs font-bold border border-blue-100">Yazma: 4 Kredi</span>
                        <span className="bg-white text-blue-700 px-3 py-1 rounded-md text-xs font-bold border border-blue-100">Konuşma: 4 Kredi</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3: Sınav Seçimi */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 shadow-sm hover:shadow-xl transition-all duration-300 group">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 font-bold text-2xl border border-red-100 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                  3
                </div>
              </div>
              <div className="flex-grow">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  Sınav Seçimi
                  <Layout className="w-6 h-6 text-gray-400" />
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Krediniz hazır olduğunda, ana sayfadan veya test sayfasından dilediğiniz sınav paketini seçin ve "Başla" butonuna tıklayın.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <Target className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-gray-700 font-medium">Test türünü belirleyin.</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <Target className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-gray-700 font-medium">Bölümleri seçin.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4: Test Çözme Süreci */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 shadow-sm hover:shadow-xl transition-all duration-300 group">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 font-bold text-2xl border border-red-100 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                  4
                </div>
              </div>
              <div className="flex-grow">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  Test Çözme Süreci
                  <Clock className="w-6 h-6 text-gray-400" />
                </h2>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Yapay zeka destekli sınav arayüzümüzde her bölüm için özel yönergeler bulunur.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center hover:border-red-100 transition-colors">
                    <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-900 text-sm mb-1">Okuma</h3>
                    <p className="text-xs text-gray-500">Metinleri analiz edin, süreyi takip edin.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center hover:border-red-100 transition-colors">
                    <Headphones className="w-8 h-8 text-green-600 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-900 text-sm mb-1">Dinleme</h3>
                    <p className="text-xs text-gray-500">Kulaklık kullanın, her metin 2 kez çalar.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center hover:border-red-100 transition-colors">
                    <PenTool className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-900 text-sm mb-1">Yazma</h3>
                    <p className="text-xs text-gray-500">Kelime limitine uyun, özgün olun.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center hover:border-red-100 transition-colors">
                    <Mic className="w-8 h-8 text-red-600 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-900 text-sm mb-1">Konuşma</h3>
                    <p className="text-xs text-gray-500">Net konuşun, süreyi verimli kullanın.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 5: Sonuçlar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 shadow-sm hover:shadow-xl transition-all duration-300 group">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 font-bold text-2xl border border-red-100 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                  5
                </div>
              </div>
              <div className="flex-grow">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  Sonuçları Görüntüleme
                  <Award className="w-6 h-6 text-gray-400" />
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Test biter bitmez yapay zeka performansınızı analiz eder. Okuma ve Dinleme puanlarınız anında, Yazma ve Konuşma raporlarınız ise detaylı analizle sunulur.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100 flex-1">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-bold text-gray-900 text-sm">Anında Puanlama</div>
                      <div className="text-xs text-gray-500">Objektif değerlendirme</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100 flex-1">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <div>
                      <div className="font-bold text-gray-900 text-sm">Detaylı Rapor</div>
                      <div className="text-xs text-gray-500">Gelişim alanları analizi</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Tips Section */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Başarı İpuçları</h2>
            <p className="text-gray-500">Testlerinizden en iyi sonuçları almanız için öneriler.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-red-100 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm text-red-600">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-3">Zaman Yönetimi</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Her bölüm için ayrılan süreyi dikkatlice kullanın. Zor sorulara takılıp kalmayın, önce bildiklerinizi yapın.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-red-100 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm text-red-600">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-3">Dikkatli Okuyun</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Soruları ve metinleri dikkatlice okuyun. Küçük detaylar büyük fark yaratabilir. Kontrol etmeyi unutmayın.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-red-100 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm text-red-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-3">Düzenli Pratik</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Düzenli olarak test çözerek kendinizi geliştirin. Her test sonrası geri bildirimleri inceleyin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6 tracking-tight">Hazır mısınız?</h2>
          <p className="text-gray-500 text-xl mb-10 max-w-2xl mx-auto font-normal">
            Türkçe seviyenizi öğrenmek için hemen teste başlayın!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <NavLink to="/test">
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-10 py-7 text-lg rounded-full shadow-xl hover:shadow-red-200 transition-all hover:-translate-y-1">
                Teste Başla <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </NavLink>
            <NavLink to="/#contact">
              <Button variant="outline" size="lg" className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 px-10 py-7 text-lg rounded-full hover:border-gray-300 transition-all">
                <HelpCircle className="mr-2 w-5 h-5" /> Destek Al
              </Button>
            </NavLink>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;
