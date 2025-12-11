import { NavLink } from "react-router";
import { 
  Wallet, 
  Coins, 
  BookOpen, 
  Headphones, 
  PenTool, 
  Mic,
  ArrowRight,
  CheckCircle,
  X,
  Info,
  Clock,
  FileText,
  Award,
  AlertCircle,
  Play,
  Pause,
  Square
} from "lucide-react";
const HowItWorksPage = () => {
  return (
    <main className="flex-grow pt-16 pb-32 bg-white">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 space-y-16 sm:space-y-24 lg:space-y-32">
          
          <div className="text-center mb-8 sm:mb-12 lg:mb-16 pt-4 sm:pt-6 lg:pt-8">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
              Sistem Kullanım Kılavuzu
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-500 font-light max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
              TurkishMock'ta nasıl hesap oluşturulur, bakiye nasıl yüklenir ve sınava nasıl girilir? Adım adım rehber.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 max-w-3xl mx-auto">
              <div className="flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="text-left">
                  <h3 className="font-bold text-blue-900 mb-2">Önemli Bilgiler</h3>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li>• Her test türü için farklı kredi maliyeti vardır</li>
                    <li>• Testlerinizi tamamladıktan sonra anında sonuç alırsınız</li>
                    <li>• AI destekli değerlendirme ile detaylı geri bildirim alırsınız</li>
                    <li>• Testlerinizi istediğiniz zaman tekrar çözebilirsiniz</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 1: LOAD BALANCE */}
          <section className="flex flex-col lg:flex-row gap-8 sm:gap-12 lg:gap-16 items-center">
            <div className="w-full lg:w-1/2 space-y-4 sm:space-y-6">
              <div className="inline-block bg-green-100 text-green-800 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-wide uppercase">
                Adım 1
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Bakiye Yükleme</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Sınavlara girmek için öncelikle hesabınıza bakiye yüklemeniz gerekir. Sağ üst köşedeki menüden <strong>cüzdan simgesine</strong> veya bakiyenize tıklayarak yükleme ekranını açın.
              </p>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200 my-4">
                <p className="text-sm text-green-800">
                  <strong>💡 İpucu:</strong> Minimum yükleme tutarı 10.000 UZS'dir. Daha fazla yükleyerek daha fazla test çözebilirsiniz.
                </p>
              </div>
              <ul className="space-y-4 pt-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 font-bold flex-shrink-0">1</div>
                  <div>
                    <span className="text-gray-700 font-medium">Üst menüdeki bakiye kutusuna tıklayın</span>
                    <p className="text-sm text-gray-500 mt-1">Sağ üst köşede "UZS 0" yazan kutuya tıklayın. Bu sizi bakiye yükleme ekranına yönlendirecektir.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 font-bold flex-shrink-0">2</div>
                  <div>
                    <span className="text-gray-700 font-medium">Yüklemek istediğiniz tutarı girin</span>
                    <p className="text-sm text-gray-500 mt-1">Örneğin: 50.000 UZS, 100.000 UZS gibi. İstediğiniz tutarı yazabilirsiniz.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 font-bold flex-shrink-0">3</div>
                  <div>
                    <span className="text-gray-700 font-medium"><strong>Payme ile Yükle</strong> butonuna basın</span>
                    <p className="text-sm text-gray-500 mt-1">Payme ödeme sistemine yönlendirileceksiniz. Ödemeyi tamamladıktan sonra bakiyeniz otomatik olarak yüklenecektir.</p>
                  </div>
                </li>
              </ul>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    <strong>Dikkat:</strong> Ödeme işlemi tamamlandıktan sonra bakiyeniz birkaç saniye içinde hesabınıza yansıyacaktır. Eğer bakiye yüklenmezse, lütfen destek ekibimizle iletişime geçin.
                  </p>
                </div>
              </div>
            </div>
            
            {/* VISUAL MOCKUP: BALANCE */}
            <div className="lg:w-1/2 w-full bg-gray-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-gray-200 relative shadow-xl">
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-white/80 backdrop-blur px-2 sm:px-3 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold text-gray-400 border border-gray-200">
                SİMÜLASYON
              </div>
              
              {/* Simulated Header */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex justify-between items-center opacity-50">
                <div className="font-serif font-bold tracking-widest text-gray-300">TURKISHMOCK</div>
                <div className="flex gap-4">
                  {/* Highlighted Balance Pill */}
                  <div className="relative group cursor-pointer">
                    <div className="flex items-center gap-3 bg-gray-100 py-1.5 px-3 rounded-lg border-2 border-red-600 animate-pulse">
                      <div className="bg-white p-1 rounded-md shadow-sm">
                        <Wallet className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">UZS 0</span>
                    </div>
                    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                      Buraya Tıklayın
                    </div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-black"></div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-100 py-1.5 px-3 rounded-lg border border-gray-200 opacity-50">
                    <div className="bg-white p-1 rounded-md shadow-sm">
                      <Coins className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">0 Kredi</span>
                  </div>
                </div>
              </div>

              {/* Simulated Modal */}
              <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-6 relative z-10 max-w-sm mx-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg">Bakiye Yükle</h3>
                  <X className="w-5 h-5 text-gray-300" />
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-lg flex justify-between border border-gray-200">
                    <span className="text-sm text-gray-500">Mevcut Bakiye</span>
                    <span className="font-bold">UZS 0</span>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Miktar</label>
                    <div className="border border-gray-300 rounded-lg p-2 mt-1 font-bold">50 000</div>
                  </div>
                  <button className="w-full bg-red-600 text-white py-3 rounded-lg font-bold text-sm shadow-md hover:bg-red-700 transition-colors relative overflow-hidden">
                    Payme ile Yükle
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* STEP 2: BUY CREDITS */}
          <section className="flex flex-col lg:flex-row-reverse gap-8 sm:gap-12 lg:gap-16 items-center">
            <div className="w-full lg:w-1/2 space-y-4 sm:space-y-6">
              <div className="inline-block bg-yellow-100 text-yellow-800 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-wide uppercase">
                Adım 2
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Kredi Satın Alma</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Sınavlara giriş yapmak için "Kredi" birimi kullanılır. Yüklediğiniz bakiyeyi krediye çevirerek avantajlı paketlerden yararlanabilirsiniz.
              </p>
              <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100">
                <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                  <Coins className="w-5 h-5"/>
                  Neden Kredi Sistemi?
                </h4>
                <p className="text-sm text-yellow-800 mb-3">
                  Her sınav bölümünün maliyeti farklıdır. Kredi sistemi, bakiyenizi parçalar halinde kullanmanıza ve toplu alımlarda indirim kazanmanıza olanak tanır.
                </p>
                <div className="bg-white/50 rounded-lg p-3 mt-3">
                  <p className="text-xs font-bold text-yellow-900 mb-2">Kredi Maliyetleri:</p>
                  <ul className="text-xs text-yellow-800 space-y-1">
                    <li>• Okuma Testi: 2 Kredi</li>
                    <li>• Dinleme Testi: 2 Kredi</li>
                    <li>• Yazma Testi: 5 Kredi</li>
                    <li>• Konuşma Testi: 5 Kredi</li>
                  </ul>
                </div>
              </div>
              <ul className="space-y-4 pt-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 font-bold flex-shrink-0">1</div>
                  <div>
                    <span className="text-gray-700 font-medium">Üst menüdeki <strong>Kredi</strong> butonuna tıklayın</span>
                    <p className="text-sm text-gray-500 mt-1">"0 Kredi" yazan butona tıklayın. Kredi satın alma ekranı açılacaktır.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 font-bold flex-shrink-0">2</div>
                  <div>
                    <span className="text-gray-700 font-medium">İhtiyacınıza uygun paketi seçin</span>
                    <p className="text-sm text-gray-500 mt-1">10 Kredi, 50 Kredi, 100 Kredi gibi paketlerden birini seçin. Daha fazla kredi alarak daha fazla test çözebilirsiniz.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 font-bold flex-shrink-0">3</div>
                  <div>
                    <span className="text-gray-700 font-medium">Onaylayın ve ödemeyi tamamlayın</span>
                    <p className="text-sm text-gray-500 mt-1">Seçtiğiniz paketi onaylayın. Tutar bakiyenizden otomatik olarak düşülecek ve kredileriniz hesabınıza eklenecektir.</p>
                  </div>
                </li>
              </ul>
            </div>
            
            {/* VISUAL MOCKUP: CREDITS */}
            <div className="lg:w-1/2 w-full bg-gray-50 rounded-3xl p-8 border border-gray-200 relative shadow-xl">
              <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded text-xs font-bold text-gray-400 border border-gray-200">
                SİMÜLASYON
              </div>
              
              {/* Simulated Header */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex justify-between items-center opacity-50">
                <div className="font-serif font-bold tracking-widest text-gray-300">TURKISHMOCK</div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-3 bg-gray-100 py-1.5 px-3 rounded-lg border border-gray-200 opacity-50">
                    <div className="bg-white p-1 rounded-md shadow-sm">
                      <Wallet className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">UZS 50.000</span>
                  </div>
                  {/* Highlighted Credit Pill */}
                  <div className="relative group cursor-pointer">
                    <div className="flex items-center gap-3 bg-gray-100 py-1.5 px-3 rounded-lg border-2 border-yellow-400 animate-pulse">
                      <div className="bg-white p-1 rounded-md shadow-sm">
                        <Coins className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">0 Kredi</span>
                    </div>
                    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                      Buraya Tıklayın
                    </div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-black"></div>
                  </div>
                </div>
              </div>

              {/* Simulated Credit Modal */}
              <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-6 relative z-10">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="border-2 border-gray-100 p-3 rounded-lg text-center opacity-60">
                    <div className="font-bold text-gray-900">10 Kredi</div>
                    <div className="text-[10px] text-gray-500">20.000 UZS</div>
                  </div>
                  <div className="border-2 border-red-600 bg-red-50 p-3 rounded-lg text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] px-2 py-0.5 rounded-bl">SEÇİLDİ</div>
                    <div className="font-bold text-red-600">50 Kredi</div>
                    <div className="text-[10px] text-gray-500">100.000 UZS</div>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mb-4">
                  <span className="text-xs font-bold text-gray-500">Toplam</span>
                  <span className="font-bold text-gray-900">100.000 UZS</span>
                </div>
                <button className="w-full bg-black text-white py-3 rounded-lg font-bold text-sm shadow-md hover:bg-gray-800 transition-colors">
                  Devam Et
                </button>
              </div>
            </div>
          </section>

          {/* STEP 3: SELECT EXAM */}
          <section className="flex flex-col lg:flex-row gap-8 sm:gap-12 lg:gap-16 items-center">
            <div className="w-full lg:w-1/2 space-y-4 sm:space-y-6">
              <div className="inline-block bg-red-100 text-red-800 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-wide uppercase">
                Adım 3
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Sınav Seçimi ve Başlangıç</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Krediniz hazır olduğunda, ana sayfadan "Teste Başla" butonuna tıklayarak seçim ekranına gidin.
              </p>
              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center text-center">
                  <div className="bg-blue-50 text-blue-600 p-2 rounded-lg mb-2">
                    <BookOpen className="w-5 h-5"/>
                  </div>
                  <div className="font-bold text-sm">Okuma / Dinleme</div>
                  <div className="text-xs text-gray-500 mt-1">2 Kredi / Test</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center text-center">
                  <div className="bg-purple-50 text-purple-600 p-2 rounded-lg mb-2">
                    <Mic className="w-5 h-5"/>
                  </div>
                  <div className="font-bold text-sm">Yazma / Konuşma</div>
                  <div className="text-xs text-gray-500 mt-1">5 Kredi / Test</div>
                </div>
              </div>
              <ul className="space-y-4 pt-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold flex-shrink-0">1</div>
                  <div>
                    <span className="text-gray-700 font-medium">Ana sayfadan "Teste Başla" butonuna tıklayın</span>
                    <p className="text-sm text-gray-500 mt-1">Ana sayfanın üst kısmında bulunan kırmızı "Teste Başla" butonuna tıklayın.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold flex-shrink-0">2</div>
                  <div>
                    <span className="text-gray-700 font-medium">Test türünü seçin</span>
                    <p className="text-sm text-gray-500 mt-1">"Tüm Testler", "Okuma", "Dinleme", "Yazma" veya "Konuşma" seçeneklerinden birini seçin.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold flex-shrink-0">3</div>
                  <div>
                    <span className="text-gray-700 font-medium">Bir test kartına tıklayın</span>
                    <p className="text-sm text-gray-500 mt-1">Listeden istediğiniz testi seçin. Test detaylarını göreceksiniz.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold flex-shrink-0">4</div>
                  <div>
                    <span className="text-gray-700 font-medium">Test bölümlerini seçin ve "Başla" butonuna tıklayın</span>
                    <p className="text-sm text-gray-500 mt-1">İstediğiniz bölümleri seçin (örn. sadece Okuma veya tümü) ve "Başla" butonuna tıklayın. Yapay zeka sistemimiz sınavınızı anında oluşturacaktır.</p>
                  </div>
                </li>
              </ul>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    <strong>Not:</strong> Test başladıktan sonra, süre takibi otomatik olarak başlar. Testi tamamlamadan çıkmak isterseniz, ilerlemeniz kaydedilir ve daha sonra devam edebilirsiniz.
                  </p>
                </div>
              </div>
            </div>
            
            {/* VISUAL MOCKUP: EXAM SELECTION */}
            <div className="lg:w-1/2 w-full bg-gray-50 rounded-3xl p-8 border border-gray-200 relative shadow-xl flex items-center justify-center">
              <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded text-xs font-bold text-gray-400 border border-gray-200">
                SİMÜLASYON
              </div>
              
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <span className="font-serif font-bold">CEFR Testi</span>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">POPÜLER</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between p-3 border border-red-600 bg-red-50 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-red-600" />
                      <span className="font-bold text-sm text-red-600">OKUMA</span>
                    </div>
                    <span className="text-xs font-bold bg-white px-2 py-1 rounded text-gray-600 shadow-sm">2 Kredi</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg opacity-50">
                    <div className="flex items-center gap-3">
                      <Headphones className="w-5 h-5 text-gray-400" />
                      <span className="font-bold text-sm text-gray-400">DİNLEME</span>
                    </div>
                    <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-400">2 Kredi</span>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Toplam</div>
                    <div className="font-bold text-gray-900">2 Kredi</div>
                  </div>
                  <button className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                    Başla
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* STEP 4: TAKING TESTS */}
          <section className="bg-gray-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12">
            <div className="text-center mb-8 sm:mb-10 lg:mb-12">
              <div className="inline-block bg-purple-100 text-purple-800 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-wide uppercase mb-3 sm:mb-4">
                Adım 4
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Test Çözme Süreci</h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto px-4">
                Test başladıktan sonra ne yapmanız gerektiğini öğrenin
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Okuma Testi</h3>
                </div>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Metinleri dikkatlice okuyun ve soruları cevaplayın</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Süre takibini yapın - her bölüm için belirli süre vardır</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Cevaplarınızı kontrol edin ve "İleri" butonuna tıklayın</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Headphones className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Dinleme Testi</h3>
                </div>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Kulaklık kullanmanızı öneririz</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Audio dosyasını dinleyin ve soruları cevaplayın</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Her bölüm için sadece bir kez dinleme hakkınız vardır</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <PenTool className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Yazma Testi</h3>
                </div>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Verilen konu hakkında kompozisyon yazın</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Minimum kelime sayısına dikkat edin</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Yazınızı gönderdikten sonra AI değerlendirmesi yapılacaktır</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <Mic className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Konuşma Testi</h3>
                </div>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Mikrofon izni verin ve test başlamadan önce mikrofon kontrolü yapın</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Soruları dinleyin ve doğal bir şekilde cevap verin</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Her soru için belirli süre vardır - süre bitmeden cevap verin</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h4 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Süre Yönetimi İpuçları
              </h4>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li>• Her test bölümü için belirli bir süre vardır - ekranın sağ alt köşesinde görebilirsiniz</li>
                <li>• Süre dolmadan önce cevaplarınızı gönderin</li>
                <li>• Test sırasında sayfayı yenilemeyin veya kapatmayın</li>
                <li>• İnternet bağlantınızın stabil olduğundan emin olun</li>
              </ul>
            </div>
          </section>

          {/* STEP 5: VIEWING RESULTS */}
          <section className="flex flex-col lg:flex-row gap-8 sm:gap-12 lg:gap-16 items-center">
            <div className="w-full lg:w-1/2 space-y-4 sm:space-y-6">
              <div className="inline-block bg-blue-100 text-blue-800 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-wide uppercase">
                Adım 5
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Sonuçları Görüntüleme</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Testinizi tamamladıktan sonra anında sonuçlarınızı görebilirsiniz. AI destekli değerlendirme ile detaylı geri bildirim alırsınız.
              </p>
              <ul className="space-y-4 pt-4">
                <li className="flex items-start gap-3">
                  <Award className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <span className="text-gray-700 font-medium">Anında Puanlama</span>
                    <p className="text-sm text-gray-500 mt-1">Testinizi tamamladıktan sonra hemen puanınızı görebilirsiniz. Okuma ve Dinleme testleri için anında sonuç alırsınız.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <span className="text-gray-700 font-medium">Detaylı Rapor</span>
                    <p className="text-sm text-gray-500 mt-1">Yazma ve Konuşma testleri için AI destekli detaylı geri bildirim alırsınız. Hangi konularda iyi olduğunuzu ve neleri geliştirmeniz gerektiğini öğrenirsiniz.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <span className="text-gray-700 font-medium">Geçmiş Sonuçlar</span>
                    <p className="text-sm text-gray-500 mt-1">Tüm test sonuçlarınızı profil sayfanızdan görüntüleyebilir ve ilerlemenizi takip edebilirsiniz.</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="lg:w-1/2 w-full bg-gray-50 rounded-3xl p-8 border border-gray-200 relative shadow-xl">
              <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded text-xs font-bold text-gray-400 border border-gray-200">
                ÖRNEK SONUÇ
              </div>
              
              <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-6 mt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg">Test Sonuçları</h3>
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                    TAMAMLANDI
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Toplam Puan</span>
                      <span className="text-2xl font-bold text-red-600">85/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-red-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Okuma</span>
                      <span className="font-bold">22/25</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Dinleme</span>
                      <span className="font-bold">20/25</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Yazma</span>
                      <span className="font-bold">21/25</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Konuşma</span>
                      <span className="font-bold">22/25</span>
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
          </section>

          {/* TIPS SECTION */}
          <section className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Başarı İpuçları</h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
                Testlerinizden en iyi sonuçları almak için bu ipuçlarını takip edin
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Zaman Yönetimi</h3>
                <p className="text-sm text-gray-600">
                  Her bölüm için ayrılan süreyi dikkatlice kullanın. Zor sorulara takılıp kalmayın, önce kolay soruları cevaplayın.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Dikkatli Okuyun</h3>
                <p className="text-sm text-gray-600">
                  Soruları ve metinleri dikkatlice okuyun. Küçük detaylar büyük fark yaratabilir. Cevaplarınızı göndermeden önce kontrol edin.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Düzenli Pratik</h3>
                <p className="text-sm text-gray-600">
                  Düzenli olarak test çözerek kendinizi geliştirin. Her test sonrası geri bildirimleri okuyun ve hatalarınızdan öğrenin.
                </p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center py-8 sm:py-10 lg:py-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Hazır mısınız?
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Türkçe seviyenizi öğrenmek için hemen teste başlayın!
            </p>
            <NavLink to="/test">
              <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-colors inline-flex items-center gap-2">
                Teste Başla
                <ArrowRight className="w-5 h-5" />
              </button>
            </NavLink>
          </section>

        </div>
      </main>
  );
};

export default HowItWorksPage;

