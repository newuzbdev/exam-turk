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
  const [isAwaitingAutoCredit, setIsAwaitingAutoCredit] = useState(false);
  const [targetCredits, setTargetCredits] = useState<number | null>(null);
  const [unitPrice, setUnitPrice] = useState<number>(1000);
  const verificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoFinalizeInFlightRef = useRef(false);
  const autoFinalizeUnitsRef = useRef<number | null>(null);
  const pendingPurchaseStorageKey = 'tm_pending_credit_purchase_v1';

  const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.data?.message ||
    error?.response?.data?.data?.error ||
    error?.message ||
    fallback;

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

  const clearAutoCreditWatch = (options?: { clearPendingStorage?: boolean }) => {
    const shouldClearPendingStorage = options?.clearPendingStorage ?? false;
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
    if (autoRefreshTimeoutRef.current) {
      clearTimeout(autoRefreshTimeoutRef.current);
      autoRefreshTimeoutRef.current = null;
    }
    autoFinalizeInFlightRef.current = false;
    if (shouldClearPendingStorage && typeof window !== 'undefined') {
      window.localStorage.removeItem(pendingPurchaseStorageKey);
    }
  };

  const tryAutoFinalizePurchase = async () => {
    if (autoFinalizeInFlightRef.current) return;

    const units = autoFinalizeUnitsRef.current;
    if (!isAwaitingAutoCredit || !units || units <= 0) return;

    autoFinalizeInFlightRef.current = true;
    try {
      const unified = await paymeService.checkoutProductSingleFlow(planId, units);
      if (unified?.status !== 'COMPLETED') return;

      clearAutoCreditWatch({ clearPendingStorage: true });
      setIsAwaitingAutoCredit(false);
      setTargetCredits(null);
      autoFinalizeUnitsRef.current = null;

      await refreshUser().catch(() => undefined);
      onSuccess?.(unified?.transaction?.id || 'auto', unified);
      toast.success(`${units} kredi otomatik olarak hesabiniza yuklendi.`);
    } catch {
      // Payment may still be processing; keep polling.
    } finally {
      autoFinalizeInFlightRef.current = false;
    }
  };

  const startAutoCreditWatch = (units: number) => {
    clearAutoCreditWatch();
    const current = user?.coin ?? 0;
    setTargetCredits(current + units);
    setIsAwaitingAutoCredit(true);
    autoFinalizeUnitsRef.current = units;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        pendingPurchaseStorageKey,
        JSON.stringify({
          planId,
          units,
          createdAt: Date.now(),
        }),
      );
    }

    autoRefreshIntervalRef.current = setInterval(() => {
      refreshUser().catch(() => undefined);
      void tryAutoFinalizePurchase();
    }, 3000);

    autoRefreshTimeoutRef.current = setTimeout(() => {
      // Keep pending purchase key for global retry in AuthContext.
      clearAutoCreditWatch();
      setIsAwaitingAutoCredit(false);
      setTargetCredits(null);
      autoFinalizeUnitsRef.current = null;
      toast.info('Odeme alindiysa kredi kisa sure icinde otomatik yansir.');
    }, 10 * 60 * 1000);
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
      // Do not clear pending storage on unmount; global watcher should keep retrying.
      clearAutoCreditWatch();
    };
  }, []);

  useEffect(() => {
    if (!isAwaitingAutoCredit || targetCredits === null) return;
    const current = user?.coin ?? 0;
    if (current < targetCredits) return;

    clearAutoCreditWatch({ clearPendingStorage: true });
    setIsAwaitingAutoCredit(false);
    setTargetCredits(null);
    autoFinalizeUnitsRef.current = null;
    onSuccess?.('auto');
    toast.success('Kredi otomatik olarak hesabiniza yuklendi.');
  }, [isAwaitingAutoCredit, onSuccess, targetCredits, user?.coin]);

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
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(pendingPurchaseStorageKey);
        }
        const txId = unified?.transaction?.id || 'purchase';
        onSuccess?.(txId, unified);
        await refreshUser().catch(() => undefined);
        return;
      }
      if (unified?.status === 'PAYMENT_REQUIRED' && unified.checkoutUrl) {
        window.open(unified.checkoutUrl, '_blank');
        toast.info('Odeme tamamlandiginda kredi otomatik yansiyacak.');
        startAutoCreditWatch(units);
        return;
      }
      if (unified?.status === 'PAYMENT_REQUIRED' && !unified.checkoutUrl) {
        toast.error(unified?.message || 'Odeme baglantisi olusturulamadi');
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
          startAutoCreditWatch(units);
          // Begin verification loop; on success, auto-purchase credits
          if (txId) {
            await startVerificationProcess(txId, units);
          }
        } else {
          toast.error(resp?.message || 'Odeme baglantisi olusturulamadi');
        }
      } else {
        toast.error(getErrorMessage(error, 'Satin alma sirasinda hata olustu'));
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
              clearAutoCreditWatch({ clearPendingStorage: true });
              autoFinalizeUnitsRef.current = null;
              setIsVerifying(false);
              onSuccess?.(transactionId, purchaseData);
              toast.success(`${amountValue} kredi basariyla satin alindi!`);
            }, 1000);
          } catch (purchaseError) {
            console.error('Product purchase failed:', purchaseError);
            setTimeout(() => {
              setIsVerifying(false);
              // Keep auto-credit watcher alive; it will retry checkout/purchase automatically.
              toast.info('Odeme alindi. Kredi otomatik tamamlanmasi bekleniyor...');
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
    clearAutoCreditWatch();
    setIsVerifying(false);
    setVerificationProgress(0);
    setIsAwaitingAutoCredit(false);
    setTargetCredits(null);
    autoFinalizeUnitsRef.current = null;
    onCancel?.();
  };

  const unitsValue = Math.floor(parseFloat(amount) || 0);
  const totalCost = unitsValue * unitPrice;
  const currentCredits = user?.coin ?? 0;
  const formattedAmount = paymeService.formatBalance(totalCost);

  const hasEnough = (user?.balance ?? 0) >= totalCost;
  // Only allow even kredi values (2, 4, 6, 8, ...)
  const presets = [2, 4, 6, 8, 10];
  const normalizeEvenUnits = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return 2;
    const floored = Math.floor(value);
    return floored % 2 === 0 ? floored : floored - 1 || 2;
  };
  const setUnits = (u: number) => setAmount(String(normalizeEvenUnits(u)));
  const dec = () => {
    const current = parseInt(amount || '0', 10) || 0;
    const next = normalizeEvenUnits(current - 2);
    setAmount(String(next));
  };
  const inc = () => {
    const current = parseInt(amount || '0', 10) || 0;
    const next = normalizeEvenUnits(current + 2);
    setAmount(String(next));
  };
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
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (!raw) {
                      setAmount('');
                      return;
                    }
                    const parsed = parseFloat(raw.replace(',', '.'));
                    if (Number.isNaN(parsed)) {
                      setAmount('');
                      return;
                    }
                    setAmount(String(normalizeEvenUnits(parsed)));
                  }}
                  min="2"
                  step="2"
                  className="text-center text-base bg-white border border-gray-300 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-900"
                />
                <button onClick={inc} className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Verification Progress */}
            {(isVerifying || isAwaitingAutoCredit) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    {isVerifying ? 'Odeme dogrulaniyor...' : 'Odeme bekleniyor...'}
                  </span>
                  {isVerifying && <span className="text-slate-500">{verificationProgress}%</span>}
                </div>
                {isVerifying && <Progress value={verificationProgress} className="w-full" />}
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

