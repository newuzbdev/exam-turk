import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
const HomeTestimonials = () => {
  return (
    <div>
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
    </div>
  );
};

export default HomeTestimonials;
