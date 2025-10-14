import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CreditCard, Loader2, Wallet, Coins, Minus, Plus, RefreshCcw } from 'lucide-react';
import { paymeService } from '@/services/payme.service';
import { toast } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';

interface PaymeCheckoutProps {
  planName: string;
  planId: string;
  onSuccess?: (transactionId: string, purchaseData?: any) => void;
  onCancel?: () => void;
  className?: string;
  initialUnits?: number;
}

export const PaymeCheckout: React.FC<PaymeCheckoutProps> = ({
  planName: _planName,
  planId,
  onSuccess,
  onCancel,
  className = '',
  initialUnits
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState<string>(initialUnits ? String(initialUnits) : '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [unitPrice, setUnitPrice] = useState<number>(1000);
  // Fetch unit price once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const products = await paymeService.getAllProducts();
        const price = products?.[0]?.price;
        if (mounted && typeof price === 'number' && price > 0) setUnitPrice(price);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const handleCheckout = async () => {
    const units = Math.floor(parseFloat(amount));
    
    if (!units || units <= 0) {
      toast.error('Lütfen geçerli bir miktar girin');
      return;
    }

    setIsLoading(true);
    try {
      // Try direct purchase via app wallet balance; backend validates funds
      const purchase = await paymeService.purchaseProduct(planId, units);
      const txId = purchase?.transaction?.id || 'purchase';
      onSuccess?.(txId, purchase);
      try { await refreshUser(); } catch {}
    } catch (e) {
      // If insufficient app balance, open Payme top-up for the difference
      const appBalance = user?.balance ?? 0;
      const required = Math.max(0, units * unitPrice - appBalance);
      if (required > 0) {
        const resp = await paymeService.initiateCheckout(required);
        const url = resp.result?.url || resp.data?.checkoutUrl;
        const txId = resp.result?.transactionId || resp.data?.transactionId;
        if (url) {
          window.open(url, '_blank');
          // Begin verification loop; on success, auto-purchase coins
          if (txId) {
            await startVerificationProcess(txId, units);
          }
        } else {
          toast.error('Ödeme bağlantısı oluşturılamadı');
        }
      } else {
        toast.error('Satın alma sırasında hata oluştu');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startVerificationProcess = async (transactionId: string, amountValue: number) => {
    setIsVerifying(true);
    setVerificationProgress(0);
    
    // Simulate verification progress
    const progressInterval = setInterval(() => {
      setVerificationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 1000);

    // Check payment status every 3 seconds
    const verificationInterval = setInterval(async () => {
      try {
        const isCompleted = await paymeService.verifyPayment(transactionId);
        
        if (isCompleted) {
          clearInterval(verificationInterval);
          clearInterval(progressInterval);
          setVerificationProgress(100);
          
          // Purchase the product after successful payment
          try {
            const purchaseData = await paymeService.purchaseProduct(planId, amountValue);
            setTimeout(() => {
              setIsVerifying(false);
              onSuccess?.(transactionId, purchaseData);
              toast.success(`${amountValue} birim başarıyla satın alındı!`);
            }, 1000);
          } catch (error) {
            console.error('Product purchase failed:', error);
            setTimeout(() => {
              setIsVerifying(false);
              onSuccess?.(transactionId);
              toast.error('Ödeme başarılı ancak ürün satın alma işleminde hata oluştu');
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Verification error:', error);
      }
    }, 3000);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(verificationInterval);
      clearInterval(progressInterval);
      setIsVerifying(false);
      toast.error('Ödeme doğrulama zaman aşımına uğradı');
    }, 300000); // 5 minutes
  };

  const handleCancel = () => {
    setIsVerifying(false);
    setVerificationProgress(0);
    onCancel?.();
  };

  const unitsValue = Math.floor(parseFloat(amount) || 0);
  const totalCost = unitsValue * unitPrice;
  const formattedBalance = paymeService.formatBalance(user?.balance ?? 0);
  const formattedAmount = paymeService.formatBalance(totalCost);

  const hasEnough = (user?.balance ?? 0) >= totalCost;
  const presets = [1, 10, 50, 100, 200];
  const setUnits = (u: number) => setAmount(String(Math.max(1, u)));
  const dec = () => setUnits(Math.max(1, (parseInt(amount || '0', 10) || 0) - 1));
  const inc = () => setUnits((parseInt(amount || '0', 10) || 0) + 1);
  const approxUnits = Math.floor((user?.balance ?? 0) / (unitPrice || 1));

  return (
    <Card className={`w-full mx-auto ${className} bg-white text-gray-900 border-0 rounded-xl shadow-sm`}> 
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left: immersive hero */}
        <div className="relative overflow-hidden p-5 md:border-r border-gray-100">
          {/* Decorative gradient removed to reduce color noise */}
          {/* Decorative icon removed per request */}
          <h3 className="text-2xl font-extrabold tracking-tight text-black">Birim Satın Al</h3>
          <p className="mt-1 text-black text-sm">
            Hedefinize uygun miktarı seçin ve hemen başlayın
          </p>
          <div className="mt-6 p-4 rounded-xl bg-slate-50 ring-1 ring-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-black">
                <Wallet className="w-5 h-5" />
                <span className="font-medium">Mevcut Bakiye</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-black">{formattedBalance}</span>
                <button
                  type="button"
                  aria-label="Yenile"
                  onClick={() => { try { refreshUser(); } catch {} }}
                  className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:shadow"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-black/70">Yaklaşık: <span className="font-semibold text-black">~ {approxUnits}U</span></div>
          </div>
        </div>

        {/* Right: controls */}
        <div className="p-5">
          <div className="space-y-4 text-black">
        {/* Presets */}
        <div className="grid grid-cols-3 gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setUnits(p)}
              className={`rounded-xl px-4 py-3 transition-colors text-left shadow-sm cursor-pointer ${
                unitsValue === p
                  ? 'bg-white ring-1 ring-gray-400'
                  : 'bg-white ring-1 ring-gray-300 hover:ring-gray-400 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm text-black">
                <Coins className="w-4 h-4 text-slate-600" /> {p}U
              </div>
              <div className="text-[11px] text-black mt-1">{paymeService.formatBalance(p * unitPrice)}</div>
            </button>
          ))}
        </div>

        {/* Units input with +/- */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-black">Birim (U) Miktarı</Label>
          <div className="flex items-center gap-2">
            <button onClick={dec} className="w-9 h-9 rounded-full bg-white ring-1 ring-gray-200 flex items-center justify-center hover:bg-gray-50">
              <Minus className="w-4 h-4" />
            </button>
            <Input
              id="amount"
              type="number"
              placeholder="Örnek: 10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              step="1"
              className="text-center text-base bg-white ring-1 ring-gray-200 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 text-black"
            />
            <button onClick={inc} className="w-9 h-9 rounded-full bg-white ring-1 ring-gray-200 flex items-center justify-center hover:bg-gray-50">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Verification Progress */}
        {isVerifying && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Ödeme doğrulanıyor...</span>
              <span className="text-slate-400">{verificationProgress}%</span>
            </div>
            <Progress value={verificationProgress} className="w-full" />
          </div>
        )}

          {/* Total cost */}
          <div className={`rounded-xl p-3 ${hasEnough ? 'bg-slate-50 ring-1 ring-slate-200' : 'bg-slate-50 ring-1 ring-slate-200'}`}>
            <div className="text-xs text-black mb-1">Toplam Tutar</div>
            <div className="text-xl font-bold text-black">{formattedAmount}</div>
            {!hasEnough && unitsValue > 0 && (
              <div className="text-xs mt-1 text-black">
                Gerekli ek bakiye: {paymeService.formatBalance(Math.max(0, totalCost - (user?.balance ?? 0)))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="ghost" onClick={handleCancel} className="h-10 ring-1 ring-gray-200 bg-white text-gray-800 hover:bg-gray-50 rounded-xl">
              İptal
            </Button>
            <Button onClick={handleCheckout} disabled={isLoading || unitsValue <= 0} className={`h-10 bg-red-600 hover:bg-red-700 text-white rounded-lg`}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  İşleniyor...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Devam Et
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </Card>
  );
};

export default PaymeCheckout;