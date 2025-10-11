import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, CreditCard, Loader2, RefreshCw } from 'lucide-react';
import { paymeService } from '@/services/payme.service';
import { toast } from '@/utils/toast';

interface PaymeCheckoutProps {
  planName: string;
  planId: string;
  onSuccess?: (transactionId: string, purchaseData?: any) => void;
  onCancel?: () => void;
  className?: string;
}

export const PaymeCheckout: React.FC<PaymeCheckoutProps> = ({
  planName,
  planId,
  onSuccess,
  onCancel,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);

  // Fetch user's Payme balance on component mount
  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    setIsCheckingBalance(true);
    try {
      const balanceResponse = await paymeService.getBalance();
      if (balanceResponse.success) {
        setBalance(balanceResponse.balance);
      } else {
        toast.error('Bakiye bilgisi alınamadı');
      }
    } catch (error) {
      console.error('Balance fetch error:', error);
      toast.error('Bakiye bilgisi alınamadı');
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const handleCheckout = async () => {
    const amountValue = parseFloat(amount);
    
    if (!amountValue || amountValue <= 0) {
      toast.error('Lütfen geçerli bir miktar girin');
      return;
    }

    setIsLoading(true);
    
    const response = await paymeService.initiateCheckout(amountValue);
    
    // Extract URL from response
    const checkoutUrl = response.result?.url || response.data?.checkoutUrl;
    
    if (checkoutUrl) {
      toast.success('Ödeme işlemi başlatıldı');
      // Open Payme checkout in new tab
      window.open(checkoutUrl, '_blank');
    } else {
      toast.error('Ödeme URL\'si alınamadı');
    }
    
    setIsLoading(false);
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

  const amountValue = parseFloat(amount) || 0;
  const isBalanceSufficient = balance >= amountValue;
  const formattedBalance = paymeService.formatBalance(balance);
  const formattedAmount = paymeService.formatBalance(amountValue);

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
          <span className="text-sm font-medium text-gray-700">Payme Bakiyeniz:</span>
          <div className="flex items-center gap-2">
            {isCheckingBalance ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            ) : (
              <RefreshCw 
                className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700" 
                onClick={fetchBalance}
              />
            )}
            <span className="font-semibold text-gray-900">{formattedBalance}</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Satın Alınacak Birim Miktarı</Label>
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
          {amountValue > 0 && (
            <div className="text-center text-sm text-gray-600">
              Toplam: {formattedAmount}
            </div>
          )}
        </div>

        {/* Balance Status */}
        {!isCheckingBalance && amountValue > 0 && (
          <div className="flex items-center gap-2">
            {isBalanceSufficient ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">Bakiye yeterli</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-700">
                  Bakiye yetersiz (Eksik: {paymeService.formatBalance(amountValue - balance)})
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
              disabled={isLoading || !isBalanceSufficient || isCheckingBalance || amountValue <= 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  İşlem Başlatılıyor...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payme ile Öde
                </>
              )}
            </Button>
          )}


          {!isBalanceSufficient && !isCheckingBalance && amountValue > 0 && (
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