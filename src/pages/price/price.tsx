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
import { CheckCircle, Zap, Target, Trophy, Users, CreditCard } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PaymeCheckoutModal from "@/components/payme/PaymeCheckoutModal";
import { toast } from "@/utils/toast";
import testCoinPriceService from "@/services/testCoinPrice.service";

// Pricing plans configuration
const pricingPlans = [
  {
    id: 'free',
    name: 'Başlangıç Deneme',
    units: 8,
    price: 0,
    description: 'Platformumuzu deneyimlemek isteyen yeni kullanıcılar için mükemmel',
    icon: CheckCircle,
    iconColor: 'green',
    isFree: true,
    buttonText: 'Ücretsiz Bonusu Al'
  },
  {
    id: 'quick',
    name: 'Hızlı Değerlendirme',
    units: 15,
    price: 25000, // 25,000 UZS
    description: 'Hedefli pratik testlerle tahmini puanınızı alın',
    icon: Target,
    iconColor: 'blue',
    isFree: false,
    buttonText: '15U Paketi Satın Al'
  },
  {
    id: 'intensive',
    name: 'Yoğun Hazırlık ⚡',
    units: 50,
    price: 75000, // 75,000 UZS
    description: '6-8 tam sınav veya odaklı beceri pratiği için mükemmel',
    icon: Zap,
    iconColor: 'yellow',
    isFree: false,
    buttonText: '50U Paketi Satın Al',
    isPopular: true
  },
  {
    id: 'expert',
    name: 'Uzman Paketi ✨',
    units: 120,
    price: 150000, // 150,000 UZS
    description: 'Sınırsız pratik fırsatlarıyla nihai hazırlık',
    icon: Trophy,
    iconColor: 'purple',
    isFree: false,
    buttonText: '120U Paketi Satın Al'
  }
];

export default function Price() {
  const [selectedPlan, setSelectedPlan] = useState<typeof pricingPlans[0] | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [initialUnits, setInitialUnits] = useState<number | undefined>(undefined);
  const [coinPrices, setCoinPrices] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;
    testCoinPriceService.getAll().then((items) => {
      if (mounted) setCoinPrices(items);
    });
    return () => { mounted = false; };
  }, []);

  const coinByType = useMemo(() => {
    const map: Record<string, number> = {};
    (coinPrices || []).forEach((i) => { map[i.testType] = i.coin; });
    return map;
  }, [coinPrices]);

  const handlePurchaseClick = (plan: typeof pricingPlans[0]) => {
    if (plan.isFree) {
      toast.success('Ücretsiz bonus hesabınıza eklendi!');
      return;
    }
    
    setSelectedPlan(plan);
    setIsCheckoutOpen(true);
  };

  // Prefill from query param neededCoins
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
  const neededCoins = url ? Number(url.searchParams.get('neededCoins') || 0) : 0;
  useState(() => {
    if (neededCoins > 0) {
      setSelectedPlan(pricingPlans[1]);
      setIsCheckoutOpen(true);
      setInitialUnits(neededCoins);
    }
    return undefined;
  });

  const handleCheckoutSuccess = (transactionId: string, purchaseData?: any) => {
    console.log('Payment successful:', transactionId);
    console.log('Purchase data:', purchaseData);
    toast.success(`${selectedPlan?.name} planı başarıyla satın alındı!`);
    setIsCheckoutOpen(false);
    setSelectedPlan(null);
  };

  const handleCheckoutClose = () => {
    setIsCheckoutOpen(false);
    setSelectedPlan(null);
  };

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

        {/* Test Pricing Overview (dynamic) */}
        <div className="rounded-xl p-6 mb-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Bireysel Test Ücretleri
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-base font-medium text-gray-600">Dinleme</div>
              <div className="text-lg font-bold text-red-600">{(coinByType["LISTENING"] ?? 3)}U</div>
            </div>
            <div className="text-center">
              <div className="text-base font-medium text-gray-600">Okuma</div>
              <div className="text-lg font-bold text-red-600">{(coinByType["READING"] ?? 3)}U</div>
            </div>
            <div className="text-center">
              <div className="text-base font-medium text-gray-600">Yazma</div>
              <div className="text-lg font-bold text-red-600">{(coinByType["WRITING"] ?? 5)}U</div>
            </div>
            <div className="text-center">
              <div className="text-base font-medium text-gray-600">Konuşma</div>
              <div className="text-lg font-bold text-red-600">{(coinByType["SPEAKING"] ?? 5)}U</div>
            </div>
            <div className="text-center">
              <div className="text-base font-medium text-gray-600">
                Tam Test
              </div>
              <div className="text-lg font-bold text-red-600">{
                ((coinByType["LISTENING"] ?? 3)
                + (coinByType["READING"] ?? 3)
                + (coinByType["WRITING"] ?? 5)
                + (coinByType["SPEAKING"] ?? 5))
              }U</div>
            </div>
          </div>
        </div>

        {/* Custom coin purchase */}
        <div className="mb-10">
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle>İstediğiniz Kadar Birim Satın Alın</CardTitle>
              <CardDescription>Kaç birime ihtiyacınız varsa girin ve Payme ile ödeyin</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  const fallback = pricingPlans.find(p => p.id === 'quick') || pricingPlans[0];
                  setSelectedPlan({ ...fallback, name: 'Birim Satın Al' } as any);
                  setInitialUnits(undefined);
                  setIsCheckoutOpen(true);
                }}
              >
                Özel Miktar Satın Al
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pricingPlans.map((plan) => {
            const IconComponent = plan.icon;
            
            // Define icon colors explicitly to avoid dynamic class issues
            const getIconStyles = (color: string) => {
              switch (color) {
                case 'green':
                  return { bg: 'bg-green-100', text: 'text-green-600' };
                case 'blue':
                  return { bg: 'bg-blue-100', text: 'text-blue-600' };
                case 'yellow':
                  return { bg: 'bg-yellow-100', text: 'text-yellow-600' };
                case 'purple':
                  return { bg: 'bg-purple-100', text: 'text-purple-600' };
                default:
                  return { bg: 'bg-gray-100', text: 'text-gray-600' };
              }
            };
            
            const iconStyles = getIconStyles(plan.iconColor);
            
            return (
              <Card 
                key={plan.id}
                className={`relative border-2 ${
                  plan.isPopular 
                    ? 'border-red-300 hover:border-red-400' 
                    : 'border-gray-200 hover:border-red-300'
                } transition-colors flex flex-col`}
              >
                {plan.isPopular && (
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-600 text-white">
              En Popüler
            </Badge>
                )}
                
            <CardHeader className="text-center flex-grow">
                  <div className={`w-12 h-12 ${iconStyles.bg} rounded-full flex items-center justify-center mx-auto`}>
                    <IconComponent className={`w-6 h-6 ${iconStyles.text}`} />
              </div>

              <CardTitle className="text-xl font-bold mt-4">
                    {plan.name}
              </CardTitle>
              <CardDescription className="text-sm">
                    {plan.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <div className="flex justify-center items-center gap-2">
                <span className="text-sm text-gray-600">Birim dahil:</span>
                    <span className="text-lg font-bold text-yellow-600">{plan.units}U</span>
              </div>

              <div className="text-3xl font-bold text-gray-900 mt-4">
                    {plan.isFree ? 'Ücretsiz' : `${plan.price.toLocaleString('tr-TR')} UZS`}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                    {plan.isFree 
                      ? 'İlk kayıt olduğunuzda bonus birimler kazanın'
                      : 'Payme ile güvenli ödeme'
                    }
              </p>
            </CardContent>

            <CardFooter className="mt-auto">
                  <Button 
                    onClick={() => handlePurchaseClick(plan)}
                    className={`w-full ${
                      plan.isFree 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white`}
                  >
                    {plan.isFree ? (
                      plan.buttonText
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        {plan.buttonText}
                      </>
                    )}
              </Button>
            </CardFooter>
          </Card>
            );
          })}
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

      {/* Payme Checkout Modal */}
      {selectedPlan && (
        <PaymeCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={handleCheckoutClose}
          planName={selectedPlan.name}
          planId={selectedPlan.id}
          onSuccess={handleCheckoutSuccess}
          initialUnits={initialUnits}
        />
      )}
    </div>
  );
}
