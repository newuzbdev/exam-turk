import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Star, TrendingUp } from "lucide-react";
import { NavLink } from "react-router";

const HomePricing = () => {
  return (
    <div>
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
            <Card className="relative border-2 border-gray-200 hover:border-red-300 transition-colors h-[450px] flex flex-col">
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

              <CardContent className="text-center flex-1 flex flex-col justify-between">
                <div>
                  <div className="mb-4">
                    <span className="text-sm text-gray-600">Birim dahil: </span>
                    <span className="text-lg font-bold text-yellow-600">
                      8U
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    Ücretsiz
                  </div>
                  <p className="text-sm text-gray-600">
                    İlk kayıt olduğunuzda bonus birimler kazanın
                  </p>
                </div>

                <NavLink to="/price" className="mt-auto">
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                    Ücretsiz Bonusu Al
                  </Button>
                </NavLink>
              </CardContent>
            </Card>
            <Card className="relative border-2 border-gray-200 hover:border-red-300 transition-colors h-[450px] flex flex-col">
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

              <CardContent className="text-center flex-1 flex flex-col justify-between">
                <div>
                  <div className="mb-4">
                    <span className="text-sm text-gray-600">Birim dahil: </span>
                    <span className="text-lg font-bold text-yellow-600">
                      15U
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    25.000 TL
                  </div>
                  <p className="text-sm text-gray-600">
                    Bir kapsamlı sınav veya birden fazla odaklı bölüm için ideal
                  </p>
                </div>

                <NavLink to="/price" className="mt-auto">
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                    15U Paketi Satın Al
                  </Button>
                </NavLink>
              </CardContent>
            </Card>
            <Card className="relative border-2 border-red-300 hover:border-red-400 transition-colors h-[450px] flex flex-col">
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

              <CardContent className="flex-1 flex flex-col justify-between">
                <ul className="space-y-4">
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
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 mt-auto"
                >
                  İletişime Geç
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePricing;
