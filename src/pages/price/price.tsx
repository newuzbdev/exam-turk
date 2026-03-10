import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Coins } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PaymeCheckoutModal from "@/components/payme/PaymeCheckoutModal";
import testCoinPriceService from "@/services/testCoinPrice.service";
import { paymeService } from "@/services/payme.service";
import { useAuth } from "@/contexts/AuthContext";

export default function Price() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [coinPrices, setCoinPrices] = useState<any[] | null>(null);
  const [coinUnitPrice, setCoinUnitPrice] = useState<number>(1000);
  const { user, refreshUser } = useAuth();
  const currentCoins = user?.coin ?? 0;

  useEffect(() => {
    let mounted = true;
    testCoinPriceService.getAll().then((items) => {
      if (mounted) setCoinPrices(items);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    paymeService.getAllProducts().then((products) => {
      const price = products?.[0]?.price;
      if (mounted && typeof price === "number" && price > 0) {
        setCoinUnitPrice(price);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const coinByType = useMemo(() => {
    const map: Record<string, number> = {};
    (coinPrices || []).forEach((i) => {
      map[i.testType] = i.coin;
    });
    return map;
  }, [coinPrices]);

  const totalTestCost = useMemo(() => {
    return (
      (coinByType["LISTENING"] ?? 3) +
      (coinByType["READING"] ?? 3) +
      (coinByType["WRITING"] ?? 5) +
      (coinByType["SPEAKING"] ?? 5)
    );
  }, [coinByType]);

  const handleCreditPurchase = () => {
    setIsCheckoutOpen(true);
  };

  const handleCheckoutSuccess = async () => {
    await refreshUser?.();
    setIsCheckoutOpen(false);
  };

  const handleCheckoutClose = () => {
    setIsCheckoutOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Kredi Satın Al
          </h1>
          <p className="text-gray-600">
            Tek akis odeme ile kredi satin alin ve teste hemen devam edin.
          </p>
        </div>

        <Card className="border border-gray-200 bg-white mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-red-600" />
                <span className="text-sm font-semibold text-gray-900">
                  Mevcut Kredi
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {currentCoins} Kredi
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-red-600" />
                <span className="text-sm font-semibold text-gray-900">
                  1 Kredi Fiyatı
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {coinUnitPrice.toLocaleString("tr-TR")} UZS
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Test Ucretleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Dinleme</span>
                <span className="font-semibold text-red-600">{coinByType["LISTENING"] ?? 3} Kredi</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Okuma</span>
                <span className="font-semibold text-red-600">{coinByType["READING"] ?? 3} Kredi</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Yazma</span>
                <span className="font-semibold text-red-600">{coinByType["WRITING"] ?? 5} Kredi</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Konusma</span>
                <span className="font-semibold text-red-600">{coinByType["SPEAKING"] ?? 5} Kredi</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-gray-50 px-3 rounded-lg mt-2">
                <div>
                  <div className="font-semibold text-gray-900">Tam Test</div>
                  <div className="text-xs text-gray-500">Toplam Maliyet</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-600">{totalTestCost} Kredi</div>
                  <div className="text-sm text-gray-600">
                    {(totalTestCost * coinUnitPrice).toLocaleString("tr-TR")} UZS
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Kredi Satın Al
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Kredi miktarini girin, Payme ile odemeyi tamamlayin.
            </p>
            <Button
              onClick={handleCreditPurchase}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <Coins className="w-4 h-4 mr-2" />
              Kredi Satın Al
            </Button>
          </CardContent>
        </Card>
      </main>

      {isCheckoutOpen && (
        <PaymeCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={handleCheckoutClose}
          planName="Kredi Satın Al"
          planId="quick"
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
