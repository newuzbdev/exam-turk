import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, Target, Trophy, Users } from "lucide-react";

export default function Price() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Premium Test Planları
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-2">
            Öğrencilerimiz TestMaster Deneme sonuçlarıyla tutarlı Türkçe
            Yeterlilik puanları elde ediyor.
          </p>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-6">
            TestMaster, 12.000'den fazla öğrencinin hedef puanlarına ulaşmasına
            yardımcı oldu.
          </p>
          <p className="text-xl font-semibold text-gray-900 mb-8">
            Geleceğinize yatırım yapın - aşağıdan size uygun planı seçin.
          </p>
        </div>

        {/* Test Pricing Overview */}
        <div className="rounded-xl p-6 mb-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Bireysel Test Ücretleri
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-base font-medium text-gray-600">Dinleme</div>
              <div className="text-lg font-bold text-red-600">3U</div>
            </div>
            <div className="text-center">
              <div className="text-base font-medium text-gray-600">Okuma</div>
              <div className="text-lg font-bold text-red-600">3U</div>
            </div>
            <div className="text-center">
              <div className="text-base font-medium text-gray-600">Yazma</div>
              <div className="text-lg font-bold text-red-600">5U</div>
            </div>
            <div className="text-center">
              <div className="text-base font-medium text-gray-600">Konuşma</div>
              <div className="text-lg font-bold text-red-600">5U</div>
            </div>
            <div className="text-center">
              <div className="text-base font-medium text-gray-600">
                Tam Test
              </div>
              <div className="text-lg font-bold text-red-600">12U</div>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Free Trial */}

          <Card className="relative border-2 border-gray-200 hover:border-red-300 transition-colors flex flex-col">
            <CardHeader className="text-center flex-grow">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>

              <CardTitle className="text-xl font-bold mt-4">
                Başlangıç Deneme
              </CardTitle>
              <CardDescription className="text-sm">
                Platformumuzu deneyimlemek isteyen yeni kullanıcılar için
                mükemmel
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <div className="flex justify-center items-center gap-2">
                <span className="text-sm text-gray-600">Birim dahil:</span>
                <span className="text-lg font-bold text-yellow-600">8U</span>
              </div>

              <div className="text-3xl font-bold text-gray-900 mt-4">
                Ücretsiz
              </div>
              <p className="text-sm text-gray-600 mt-2">
                İlk kayıt olduğunuzda bonus birimler kazanın
              </p>
            </CardContent>

            <CardFooter className="mt-auto">
              <Button className="bg-red-600 hover:bg-red-700 text-white w-full">
                Ücretsiz Bonusu Al
              </Button>
            </CardFooter>
          </Card>

          {/* One Shot */}

          <Card className="relative border-2 border-gray-200 hover:border-red-300 transition-colors flex flex-col">
            <CardHeader className="text-center flex-grow">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Target className="w-6 h-6 text-blue-600" />
              </div>

              <CardTitle className="text-xl font-bold mt-4">
                Hızlı Değerlendirme
              </CardTitle>
              <CardDescription className="text-sm">
                Hedefli pratik testlerle tahmini puanınızı alın
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <div className="flex justify-center items-center gap-2">
                <span className="text-sm text-gray-600">Birim dahil:</span>
                <span className="text-lg font-bold text-yellow-600">15U</span>
              </div>

              <div className="text-3xl font-bold text-gray-900 mt-4">
                25.000 TL
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Bir kapsamlı sınav veya birden fazla odaklı bölüm için ideal
              </p>
            </CardContent>

            <CardFooter className="mt-auto">
              <Button className="bg-red-600 hover:bg-red-700 text-white w-full">
                15U Paketi Satın Al
              </Button>
            </CardFooter>
          </Card>

          {/* Quick Preparation */}

          <Card className="relative border-2 border-red-300 hover:border-red-400 transition-colors flex flex-col">
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-600 text-white">
              En Popüler
            </Badge>
            <CardHeader className="text-center flex-grow">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6 text-yellow-600" />
              </div>

              <CardTitle className="text-xl font-bold mt-4">
                Yoğun Hazırlık ⚡
              </CardTitle>
              <CardDescription className="text-sm">
                6-8 tam sınav veya odaklı beceri pratiği için mükemmel
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <div className="flex justify-center items-center gap-2">
                <span className="text-sm text-gray-600">Birim dahil:</span>
                <span className="text-lg font-bold text-yellow-600">50U</span>
              </div>

              <div className="text-3xl font-bold text-gray-900 mt-4">
                75.000 TL
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Ciddi sınav adayları için kapsamlı hazırlık
              </p>
            </CardContent>

            <CardFooter className="mt-auto">
              <Button className="bg-red-600 hover:bg-red-700 text-white w-full">
                50U Paketi Satın Al
              </Button>
            </CardFooter>
          </Card>

          {/* Full Practice */}

          <Card className="relative border-2 border-gray-200 hover:border-red-300 transition-colors flex flex-col">
            <CardHeader className="text-center flex-grow">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>

              <CardTitle className="text-xl font-bold mt-4">
                Uzman Paketi ✨
              </CardTitle>
              <CardDescription className="text-sm">
                Sınırsız pratik fırsatlarıyla nihai hazırlık
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <div className="flex justify-center items-center gap-2">
                <span className="text-sm text-gray-600">Birim dahil:</span>
                <span className="text-lg font-bold text-yellow-600">120U</span>
              </div>

              <div className="text-3xl font-bold text-gray-900 mt-4">
                150.000 TL
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Maksimum puan artışı için tam hakimiyet paketi
              </p>
            </CardContent>

            <CardFooter className="mt-auto">
              <Button className="bg-red-600 hover:bg-red-700 text-white w-full">
                120U Paketi Satın Al
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-4xl mx-auto">
            <Users className="w-8 h-8 text-red-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Binlerce Başarılı Öğrenciye Katılın
            </h3>
            <p className="text-gray-600">
              Kanıtlanmış metodolojimiz ve kapsamlı pratik testlerimiz, dünya
              çapında öğrencilerin hedef Türkçe Yeterlilik puanlarına
              ulaşmalarına yardımcı oldu. Başarı yolculuğunuza bugün başlayın!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
