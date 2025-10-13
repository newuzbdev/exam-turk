import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, CreditCard, Loader2 } from 'lucide-react';
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
  planName,
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

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
          <img 
            src="https://payme.uz/assets/images/logo.svg" 
            alt="Payme" 
            className="w-12 h-12"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling.style.display = 'block';
            }}
          />
          <CreditCard className="w-6 h-6 text-blue-600 hidden" />
        </div>
        <CardTitle className="text-xl font-bold">{planName}</CardTitle>
        <CardDescription>
          Birim satın alın
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Cüzdan Bakiyesi (UZS):</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{formattedBalance}</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Satın Alınacak Birim (U) Miktarı</Label>
          <Input
            id="amount"
            type="number"
            placeholder="Örnek: 10"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="1"
            className="text-center text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {unitsValue > 0 && (
            <div className="text-center text-sm text-gray-600">
              Toplam: {formattedAmount}
            </div>
          )}
        </div>

        {/* Balance Status */}
        {unitsValue > 0 && (
          <div className="flex items-center gap-2">
            {(user?.balance ?? 0) >= totalCost ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">Bakiye yeterli</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-700">
                  Bakiye yetersiz (Eksik: {paymeService.formatBalance(Math.max(0, totalCost - (user?.balance ?? 0)))})
                </span>
              </>
            )}
          </div>
        )}

        {/* Verification Progress */}
        {isVerifying && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Ödeme doğrulanıyor...</span>
              <span className="text-gray-500">{verificationProgress}%</span>
            </div>
            <Progress value={verificationProgress} className="w-full" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {!isVerifying && (
            <Button
              onClick={handleCheckout}
              disabled={isLoading || unitsValue <= 0}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  İşlem Başlatılıyor...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Satın Al
                </>
              )}
            </Button>
          )}


          {(user?.balance ?? 0) < totalCost && unitsValue > 0 && (
            <div className="text-center">
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Payme hesabınıza para yükleyin
              </Badge>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
};

export default PaymeCheckout;