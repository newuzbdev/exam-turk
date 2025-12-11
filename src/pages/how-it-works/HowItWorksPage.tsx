import { NavLink } from "react-router";
import { 
  Coins, 
  BookOpen, 
  Headphones, 
  PenTool, 
  Mic,
  ArrowRight,
  CheckCircle,
  X,
  Clock,
  FileText,
  Award,
  Sparkles,
  Zap,
  Target,
  TrendingUp,
} from "lucide-react";

const HowItWorksPage = () => {
  return (
    <main className="flex-grow pt-16 pb-32 bg-gradient-to-b from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          
          {/* Hero Section */}
          <div className="text-center mb-16 sm:mb-20 lg:mb-24 pt-8 sm:pt-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-100 to-orange-100 text-red-700 px-5 py-2.5 rounded-full text-sm font-semibold mb-6 shadow-sm">
              <Sparkles className="w-4 h-4" />
              <span>Başlangıç Rehberi</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Nasıl <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Çalışır?</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-12 px-4 leading-relaxed">
              TurkishMock platformunu kullanarak Türkçe seviyenizi öğrenmek için gereken tüm adımlar
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2">4</div>
                <div className="text-sm text-gray-600 font-medium">Test Türü</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2">5</div>
                <div className="text-sm text-gray-600 font-medium">Basit Adım</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2">AI</div>
                <div className="text-sm text-gray-600 font-medium">Değerlendirme</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2">24/7</div>
                <div className="text-sm text-gray-600 font-medium">Erişim</div>
              </div>
            </div>
          </div>

          {/* Steps Container */}
          <div className="space-y-8 sm:space-y-12">
            
            {/* STEP 1: LOAD BALANCE */}
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full hidden lg:block"></div>
              <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden ml-0 lg:ml-8 hover:shadow-3xl transition-shadow">
                <div className="grid lg:grid-cols-2 gap-0">
                  {/* Left: Content */}
                  <div className="p-6 sm:p-8 lg:p-12 order-2 lg:order-1">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                        1
                      </div>
                      <div>
                        <div className="text-green-600 text-xs font-bold uppercase tracking-wider">İlk Adım</div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Bakiye Yükleme</h2>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Sınavlara girmek için öncelikle hesabınıza bakiye yüklemeniz gerekir. Sağ üst köşedeki menüden cüzdan simgesine veya bakiyenize tıklayarak yükleme ekranını açın.
                    </p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">Üst menüdeki bakiye kutusuna tıklayın</div>
                          <div className="text-xs text-gray-500 mt-1">Sağ üst köşede "UZS 0" yazan kutuya tıklayın</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">Yüklemek istediğiniz tutarı girin</div>
                          <div className="text-xs text-gray-500 mt-1">Örn: 50.000 UZS, 100.000 UZS</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">Payme ile Yükle butonuna basın</div>
                          <div className="text-xs text-gray-500 mt-1">Ödeme tamamlandıktan sonra bakiye otomatik yüklenir</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Zap className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-900">
                          <strong>İpucu:</strong> Minimum yükleme tutarı 10.000 UZS'dir. Daha fazla yükleyerek daha fazla test çözebilirsiniz.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Visual */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 sm:p-8 lg:p-12 flex items-center justify-center order-1 lg:order-2">
                    <div className="w-full max-w-sm">
                      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-bold text-lg">Bakiye Yükle</h3>
                          <X className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="space-y-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">Mevcut Bakiye</div>
                            <div className="text-2xl font-bold text-gray-900">UZS 0</div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase mb-2 block">Miktar</label>
                            <div className="border-2 border-gray-300 rounded-lg p-3 font-bold text-lg">50 000</div>
                          </div>
                          <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all">
                            Payme ile Yükle
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2: BUY CREDITS */}
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-500 to-orange-600 rounded-full hidden lg:block"></div>
              <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden ml-0 lg:ml-8 hover:shadow-3xl transition-shadow">
                <div className="grid lg:grid-cols-2 gap-0">
                  {/* Left: Visual */}
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 sm:p-8 lg:p-12 flex items-center justify-center order-1">
                    <div className="w-full max-w-sm">
                      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
                        <h3 className="font-bold text-lg mb-4">Kredi Paketleri</h3>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="border-2 border-gray-200 p-4 rounded-xl text-center">
                            <div className="font-bold text-gray-900">10</div>
                            <div className="text-xs text-gray-500">20.000 UZS</div>
                          </div>
                          <div className="border-2 border-red-600 bg-red-50 p-4 rounded-xl text-center relative">
                            <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] px-2 py-1 rounded-bl">SEÇİLDİ</div>
                            <div className="font-bold text-red-600">50</div>
                            <div className="text-xs text-gray-500">100.000 UZS</div>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg mb-4 flex justify-between">
                          <span className="text-sm font-semibold">Toplam</span>
                          <span className="font-bold">100.000 UZS</span>
                        </div>
                        <button className="w-full bg-black text-white py-3 rounded-lg font-bold">
                          Devam Et
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Content */}
                  <div className="p-6 sm:p-8 lg:p-12 order-2">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                        2
                      </div>
                      <div>
                        <div className="text-yellow-600 text-xs font-bold uppercase tracking-wider">İkinci Adım</div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Kredi Satın Alma</h2>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Sınavlara giriş yapmak için "Kredi" birimi kullanılır. Yüklediğiniz bakiyeyi krediye çevirerek avantajlı paketlerden yararlanabilirsiniz.
                    </p>

                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-5 mb-6">
                      <div className="flex items-start gap-3">
                        <Coins className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                        <div>
                          <h4 className="font-bold text-yellow-900 mb-2">Neden Kredi Sistemi?</h4>
                          <p className="text-sm text-yellow-800">
                            Her sınav bölümünün maliyeti farklıdır. Kredi sistemi, bakiyenizi parçalar halinde kullanmanıza olanak tanır.
                          </p>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white/50 p-2 rounded">Okuma: 2 Kredi</div>
                            <div className="bg-white/50 p-2 rounded">Dinleme: 2 Kredi</div>
                            <div className="bg-white/50 p-2 rounded">Yazma: 5 Kredi</div>
                            <div className="bg-white/50 p-2 rounded">Konuşma: 5 Kredi</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">Üst menüdeki Kredi butonuna tıklayın</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">İhtiyacınıza uygun paketi seçin</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">Onaylayın - Tutar bakiyenizden düşülecektir</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3: SELECT EXAM */}
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-pink-600 rounded-full hidden lg:block"></div>
              <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden ml-0 lg:ml-8 hover:shadow-3xl transition-shadow">
                <div className="grid lg:grid-cols-2 gap-0">
                  {/* Left: Content */}
                  <div className="p-6 sm:p-8 lg:p-12 order-2 lg:order-1">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                        3
                      </div>
                      <div>
                        <div className="text-red-600 text-xs font-bold uppercase tracking-wider">Üçüncü Adım</div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Sınav Seçimi</h2>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Krediniz hazır olduğunda, ana sayfadan "Teste Başla" butonuna tıklayarak seçim ekranına gidin.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 text-center">
                        <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <div className="font-bold text-sm text-gray-900">Okuma/Dinleme</div>
                        <div className="text-xs text-gray-600 mt-1">2 Kredi</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 text-center">
                        <Mic className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <div className="font-bold text-sm text-gray-900">Yazma/Konuşma</div>
                        <div className="text-xs text-gray-600 mt-1">5 Kredi</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                        <Target className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">Ana sayfadan "Teste Başla" butonuna tıklayın</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                        <Target className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">Test türünü seçin (Okuma, Dinleme, Yazma, Konuşma)</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                        <Target className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">Bir test kartına tıklayın ve bölümleri seçin</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                        <Target className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">"Başla" butonuna tıklayın - AI sınavınızı oluşturacak</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Visual */}
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 sm:p-8 lg:p-12 flex items-center justify-center order-1 lg:order-2">
                    <div className="w-full max-w-sm">
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                          <span className="font-bold">CEFR Testi</span>
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">POPÜLER</span>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between p-3 border-2 border-red-600 bg-red-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <BookOpen className="w-5 h-5 text-red-600" />
                              <span className="font-bold text-sm text-red-600">OKUMA</span>
                            </div>
                            <span className="text-xs font-bold bg-white px-2 py-1 rounded">2 Kredi</span>
                          </div>
                          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg opacity-50">
                            <div className="flex items-center gap-3">
                              <Headphones className="w-5 h-5 text-gray-400" />
                              <span className="font-bold text-sm text-gray-400">DİNLEME</span>
                            </div>
                            <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded">2 Kredi</span>
                          </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                          <div>
                            <div className="text-[10px] text-gray-500 uppercase font-bold">Toplam</div>
                            <div className="font-bold text-gray-900">2 Kredi</div>
                          </div>
                          <button className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg">
                            Başla
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 4: TAKING TESTS */}
            <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-3xl p-6 sm:p-8 lg:p-12 shadow-2xl border border-purple-100">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    4
                  </div>
                  <div className="text-left">
                    <div className="text-purple-600 text-xs font-bold uppercase tracking-wider">Dördüncü Adım</div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Test Çözme Süreci</h2>
                  </div>
                </div>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Test başladıktan sonra ne yapmanız gerektiğini öğrenin
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3">Okuma Testi</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>Metinleri dikkatlice okuyun</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>Süre takibini yapın</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>Cevaplarınızı kontrol edin</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                    <Headphones className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3">Dinleme Testi</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Kulaklık kullanın</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Audio dosyasını dinleyin</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Bir kez dinleme hakkı</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                    <PenTool className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3">Yazma Testi</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span>Kompozisyon yazın</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span>Minimum kelime sayısına dikkat</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span>AI değerlendirmesi yapılacak</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                    <Mic className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3">Konuşma Testi</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Mikrofon izni verin</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Doğal bir şekilde cevap verin</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Süre bitmeden cevap verin</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 bg-white/80 backdrop-blur rounded-2xl p-6 border border-purple-200">
                <div className="flex items-start gap-4">
                  <Clock className="w-6 h-6 text-purple-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Süre Yönetimi İpuçları</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• Her test bölümü için belirli bir süre vardır - ekranın sağ alt köşesinde görebilirsiniz</li>
                      <li>• Süre dolmadan önce cevaplarınızı gönderin</li>
                      <li>• Test sırasında sayfayı yenilemeyin veya kapatmayın</li>
                      <li>• İnternet bağlantınızın stabil olduğundan emin olun</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 5: VIEWING RESULTS */}
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full hidden lg:block"></div>
              <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden ml-0 lg:ml-8 hover:shadow-3xl transition-shadow">
                <div className="grid lg:grid-cols-2 gap-0">
                  {/* Left: Content */}
                  <div className="p-6 sm:p-8 lg:p-12 order-2 lg:order-1">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                        5
                      </div>
                      <div>
                        <div className="text-blue-600 text-xs font-bold uppercase tracking-wider">Son Adım</div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Sonuçları Görüntüleme</h2>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Testinizi tamamladıktan sonra anında sonuçlarınızı görebilirsiniz. AI destekli değerlendirme ile detaylı geri bildirim alırsınız.
                    </p>

                    <div className="space-y-4">
                      <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
                        <Award className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        <div>
                          <h4 className="font-bold text-gray-900 mb-1">Anında Puanlama</h4>
                          <p className="text-sm text-gray-600">Testinizi tamamladıktan sonra hemen puanınızı görebilirsiniz. Okuma ve Dinleme testleri için anında sonuç alırsınız.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
                        <FileText className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        <div>
                          <h4 className="font-bold text-gray-900 mb-1">Detaylı Rapor</h4>
                          <p className="text-sm text-gray-600">Yazma ve Konuşma testleri için AI destekli detaylı geri bildirim alırsınız. Hangi konularda iyi olduğunuzu ve neleri geliştirmeniz gerektiğini öğrenirsiniz.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
                        <TrendingUp className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        <div>
                          <h4 className="font-bold text-gray-900 mb-1">Geçmiş Sonuçlar</h4>
                          <p className="text-sm text-gray-600">Tüm test sonuçlarınızı profil sayfanızdan görüntüleyebilir ve ilerlemenizi takip edebilirsiniz.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Visual */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 sm:p-8 lg:p-12 flex items-center justify-center order-1 lg:order-2">
                    <div className="w-full max-w-sm">
                      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-bold text-lg">Test Sonuçları</h3>
                          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                            TAMAMLANDI
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">Toplam Puan</span>
                              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">85/100</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full" style={{ width: '85%' }}></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Okuma</span>
                              <span className="font-bold text-gray-900">22/25</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Dinleme</span>
                              <span className="font-bold text-gray-900">20/25</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Yazma</span>
                              <span className="font-bold text-gray-900">21/25</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Konuşma</span>
                              <span className="font-bold text-gray-900">22/25</span>
                            </div>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                            <p className="text-xs text-blue-800">
                              <strong>AI Geri Bildirimi:</strong> Genel olarak iyi bir performans gösterdiniz. Kelime haznenizi genişletmeye devam edin.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TIPS SECTION */}
            <div className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 rounded-3xl p-6 sm:p-8 lg:p-12 shadow-2xl border border-red-100">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full mb-4">
                  <Sparkles className="w-5 h-5 text-red-600" />
                  <span className="font-bold text-gray-900">Başarı İpuçları</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">Testlerinizden En İyi Sonuçları Alın</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Bu ipuçlarını takip ederek performansınızı artırın
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3">Zaman Yönetimi</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Her bölüm için ayrılan süreyi dikkatlice kullanın. Zor sorulara takılıp kalmayın, önce kolay soruları cevaplayın.
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3">Dikkatli Okuyun</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Soruları ve metinleri dikkatlice okuyun. Küçük detaylar büyük fark yaratabilir. Cevaplarınızı göndermeden önce kontrol edin.
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3">Düzenli Pratik</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Düzenli olarak test çözerek kendinizi geliştirin. Her test sonrası geri bildirimleri okuyun ve hatalarınızdan öğrenin.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* CTA Section */}
          <section className="text-center py-12 sm:py-16 mt-12">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl p-8 sm:p-12 lg:p-16 shadow-2xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                Hazır mısınız?
              </h2>
              <p className="text-lg sm:text-xl text-red-50 mb-8 max-w-2xl mx-auto">
                Türkçe seviyenizi öğrenmek için hemen teste başlayın!
              </p>
              <NavLink to="/test">
                <button className="bg-white text-red-600 px-8 py-4 rounded-xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all hover:scale-105 inline-flex items-center gap-2">
                  Teste Başla
                  <ArrowRight className="w-5 h-5" />
                </button>
              </NavLink>
            </div>
          </section>

        </div>
      </main>
  );
};

export default HowItWorksPage;
