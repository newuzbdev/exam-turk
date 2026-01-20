import { Award, CheckCircle, TrendingUp } from "lucide-react";

const FeaturedSection = () => {
  return (
    <div>
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
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
    </div>
  );
};

export default FeaturedSection;
