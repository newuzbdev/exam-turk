import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, Plus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { paymeService } from '@/services/payme.service';
import { toast } from '@/utils/toast';

interface BalanceTopUpProps {
  currentBalance: number;
  onBalanceUpdate: () => Promise<void>;
}

export const BalanceTopUp: React.FC<BalanceTopUpProps> = ({
  currentBalance,
  onBalanceUpdate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  const handleTopUp = async () => {
    const amountValue = parseFloat(amount);
    
    if (!amountValue || amountValue <= 0) {
      toast.error('Lütfen geçerli bir miktar girin');
      return;
    }

    if (amountValue < 1000) {
      toast.error('Minimum yükleme miktarı 1,000 UZS');
      return;
    }

    setIsLoading(true);
    try {
      const response = await paymeService.initiateCheckout(amountValue);
      
      // Extract URL from response
      const checkoutUrl = response.result?.url || response.data?.checkoutUrl;
      
      if (checkoutUrl) {
        // Open Payme checkout in new window
        const checkoutWindow = window.open(checkoutUrl, '_blank', 'width=600,height=700');
        
        if (checkoutWindow) {
          // Start checking for payment completion
          const transactionId = response.result?.transactionId || response.data?.transactionId;
          if (transactionId) {
            checkPaymentStatus(transactionId);
          }
        } else {
          toast.error('Popup engellendi. Lütfen popup\'ları etkinleştirin.');
        }
      } else {
        toast.error('Ödeme URL\'si alınamadı');
      }
    } catch (error) {
      console.error('Top-up error:', error);
      toast.error('Bakiye yükleme işlemi başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  const checkPaymentStatus = async (transactionId: string) => {
    const checkInterval = setInterval(async () => {
      try {
        const isCompleted = await paymeService.verifyPayment(transactionId);
        
        if (isCompleted) {
          clearInterval(checkInterval);
          toast.success('Bakiye başarıyla yüklendi!');
          setIsOpen(false);
          setAmount('');
          // Refresh balance
          fetchBalance();
        }
      } catch (error) {
        console.error('Payment verification error:', error);
      }
    }, 3000);

    // Timeout after 10 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 600000);
  };

  const fetchBalance = async () => {
    setIsCheckingBalance(true);
    try {
      await onBalanceUpdate();
    } catch (error) {
      console.error('Balance fetch error:', error);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const formattedBalance = paymeService.formatBalance(currentBalance);
  const amountValue = parseFloat(amount) || 0;
  const formattedAmount = paymeService.formatBalance(amountValue);

  return (
    <>
      {/* Balance Display Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Wallet className="w-4 h-4" />
        <span className="hidden sm:inline">{formattedBalance}</span>
        <Plus className="w-3 h-3" />
      </Button>

      {/* Top-up Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md w-[92vw] bg-white border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-center text-black">Bakiye Yükle</DialogTitle>
            <DialogDescription className="text-center text-black">Bakiye yükleme</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Balance */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm font-medium text-black">Mevcut Bakiye:</span>
              <div className="flex items-center gap-2">
                {isCheckingBalance ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                ) : (
                  <span className="font-semibold text-black">{formattedBalance}</span>
                )}
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="topup-amount" className="text-black">Yüklenecek Miktar (UZS)</Label>
              <Input
                id="topup-amount"
                type="number"
                placeholder="Örnek: 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1000"
                step="1000"
                className="text-center text-lg focus-visible:ring-0 focus-visible:ring-offset-0 border-gray-300 text-black"
              />
              {amountValue > 0 && (
                <div className="text-center text-sm text-black">
                  Yüklenecek: {formattedAmount}
                </div>
              )}
            </div>

            {/* Validation Messages */}
            {amountValue > 0 && amountValue < 1000 && (
              <div className="flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span>Minimum yükleme miktarı 1,000 UZS</span>
              </div>
            )}

            {amountValue >= 1000 && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span>Miktar geçerli</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                onClick={handleTopUp}
                disabled={isLoading || amountValue < 1000}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    İşlem Başlatılıyor...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Payme ile Yükle
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="w-full border-gray-300"
              >
                İptal
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BalanceTopUp;
