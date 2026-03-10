import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CreditCard, Loader2, Coins, Minus, Plus, RefreshCcw } from 'lucide-react';
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
  const verificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearVerificationTimers = () => {
    if (verificationIntervalRef.current) {
      clearInterval(verificationIntervalRef.current);
      verificationIntervalRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
      verificationTimeoutRef.current = null;
    }
  };

  // Fetch unit price once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const products = await paymeService.getAllProducts();
        const price = products?.[0]?.price;
        if (mounted && typeof price === 'number' && price > 0) setUnitPrice(price);
      } catch {
        // no-op
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      clearVerificationTimers();
    };
  }, []);

  const handleCheckout = async () => {
    const units = Math.floor(parseFloat(amount));

    if (!units || units <= 0) {
      toast.error('Lutfen gecerli bir miktar girin');
      return;
    }

    setIsLoading(true);
    try {
      // Preferred single-flow checkout. Backend decides direct purchase vs Payme top-up.
      const unified = await paymeService.checkoutProductSingleFlow(planId, units);
      if (unified?.status === 'COMPLETED') {
        const txId = unified?.transaction?.id || 'purchase';
        onSuccess?.(txId, unified);
        await refreshUser().catch(() => undefined);
        return;
      }
      if (unified?.status === 'PAYMENT_REQUIRED' && unified.checkoutUrl) {
        window.open(unified.checkoutUrl, '_blank');
        toast.info('Odeme tamamlandiktan sonra tekrar Devam Et butonuna basin.');
        await refreshUser().catch(() => undefined);
        return;
      }

      // Legacy fallback for older backend payloads
      const purchase = await paymeService.purchaseProduct(planId, units);
      const txId = purchase?.transaction?.id || 'purchase';
      onSuccess?.(txId, purchase);
      await refreshUser().catch(() => undefined);
    } catch (error: any) {
      // If insufficient app balance, open Payme top-up for the difference
      const appBalance = user?.balance ?? 0;
      const required = Math.max(0, units * unitPrice - appBalance);
      const isInsufficient = paymeService.isInsufficientBalanceError(error);

      if (required > 0 && isInsufficient) {
        const resp = await paymeService.initiateCheckout(required);
        const url = resp.result?.url || resp.data?.checkoutUrl;
        const txId = resp.result?.transactionId || resp.data?.transactionId;
        if (url) {
          window.open(url, '_blank');
          // Begin verification loop; on success, auto-purchase credits
          if (txId) {
            await startVerificationProcess(txId, units);
          }
        } else {
          toast.error('Odeme baglantisi olusturulamadi');
        }
      } else {
        toast.error(error?.response?.data?.message || 'Satin alma sirasinda hata olustu');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startVerificationProcess = async (transactionId: string, amountValue: number) => {
    clearVerificationTimers();
    setIsVerifying(true);
    setVerificationProgress(0);

    // Simulate verification progress
    progressIntervalRef.current = setInterval(() => {
      setVerificationProgress(prev => {
        if (prev >= 90) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          return 90;
        }
        return prev + 10;
      });
    }, 1000);

    // Check payment status every 3 seconds
    verificationIntervalRef.current = setInterval(async () => {
      try {
        const status = await paymeService.checkTransactionStatus(transactionId);
        if (!status.success) return;

        if (status.status === 'completed') {
          clearVerificationTimers();
          setVerificationProgress(100);

          // Purchase the product after successful payment
          try {
            const purchaseData = await paymeService.purchaseProduct(planId, amountValue);
            setTimeout(() => {
              setIsVerifying(false);
              onSuccess?.(transactionId, purchaseData);
              toast.success(`${amountValue} kredi basariyla satin alindi!`);
            }, 1000);
          } catch (purchaseError) {
            console.error('Product purchase failed:', purchaseError);
            setTimeout(() => {
              setIsVerifying(false);
              onSuccess?.(transactionId);
              toast.error('Odeme basarili ancak urun satin alma isleminde hata olustu');
            }, 1000);
          }
          return;
        }

        if (status.status === 'failed' || status.status === 'cancelled') {
          clearVerificationTimers();
          setIsVerifying(false);
          toast.error(
            status.status === 'failed' ? 'Odeme basarisiz oldu' : 'Odeme iptal edildi'
          );
        }
      } catch (verifyError) {
        console.error('Verification error:', verifyError);
      }
    }, 3000);

    // Timeout after 5 minutes
    verificationTimeoutRef.current = setTimeout(() => {
      clearVerificationTimers();
      setIsVerifying(false);
      toast.error('Odeme dogrulama zaman asimina ugradi');
    }, 300000);
  };

  const handleCancel = () => {
    clearVerificationTimers();
    setIsVerifying(false);
    setVerificationProgress(0);
    onCancel?.();
  };

  const unitsValue = Math.floor(parseFloat(amount) || 0);
  const totalCost = unitsValue * unitPrice;
  const currentCredits = user?.coin ?? 0;
  const formattedAmount = paymeService.formatBalance(totalCost);

  const hasEnough = (user?.balance ?? 0) >= totalCost;
  const presets = [1, 10, 50, 100, 200];
  const setUnits = (u: number) => setAmount(String(Math.max(1, u)));
  const dec = () => setUnits(Math.max(1, (parseInt(amount || '0', 10) || 0) - 1));
  const inc = () => setUnits((parseInt(amount || '0', 10) || 0) + 1);
  const approxUnits = Math.floor((user?.balance ?? 0) / (unitPrice || 1));

  return (
    <Card className={`w-full mx-auto ${className} bg-gray-50 text-gray-900 border border-gray-200 rounded-xl shadow-sm`}>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left: immersive hero */}
        <div className="relative overflow-hidden p-5 md:border-r border-gray-200">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Kredi, platformdaki testleri ve ozellikleri kullanabilmek icin gerekli olan dijital bir birimdir
            </p>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-white border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700">
                <Coins className="w-5 h-5" />
                <span className="font-medium">Mevcut Kredi</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">{currentCredits} Kredi</span>
                <button
                  type="button"
                  aria-label="Yenile"
                  onClick={() => { try { refreshUser(); } catch {} }}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <RefreshCcw className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">Yaklasik: <span className="font-semibold text-gray-900">~ {approxUnits} Kredi</span></div>
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
                  className={`rounded-xl px-4 py-3 transition-all text-left cursor-pointer border ${
                    unitsValue === p
                      ? 'bg-white border-gray-400 shadow-md'
                      : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm text-gray-900">
                    <Coins className="w-4 h-4 text-gray-600" /> {p} Kredi
                  </div>
                  <div className="text-[11px] text-gray-600 mt-1">{paymeService.formatBalance(p * unitPrice)}</div>
                </button>
              ))}
            </div>

            {/* Units input with +/- */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-gray-700 font-medium">Kredi</Label>
              <div className="flex items-center gap-2">
                <button onClick={dec} className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <Minus className="w-4 h-4 text-gray-600" />
                </button>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Ornek: 10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="1"
                  className="text-center text-base bg-white border border-gray-300 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-900"
                />
                <button onClick={inc} className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Verification Progress */}
            {isVerifying && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Odeme dogrulaniyor...</span>
                  <span className="text-slate-500">{verificationProgress}%</span>
                </div>
                <Progress value={verificationProgress} className="w-full" />
              </div>
            )}

            {/* Total cost */}
            <div className="rounded-xl p-4 bg-white border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Toplam Tutar</div>
              <div className="text-xl font-bold text-gray-900">{formattedAmount}</div>
              {!hasEnough && unitsValue > 0 && (
                <div className="text-xs mt-2 text-gray-600">
                  Gerekli ek bakiye: {paymeService.formatBalance(Math.max(0, totalCost - (user?.balance ?? 0)))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="ghost" onClick={handleCancel} className="h-11 border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Iptal
              </Button>
              <Button onClick={handleCheckout} disabled={isLoading || unitsValue <= 0} className="h-11 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Isleniyor...
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

