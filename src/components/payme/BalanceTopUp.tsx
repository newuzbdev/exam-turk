import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet,  Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { paymeService } from '@/services/payme.service';
import { toast } from '@/utils/toast';

interface BalanceTopUpProps {
  currentBalance: number;
  onBalanceUpdate: () => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export const BalanceTopUp: React.FC<BalanceTopUpProps> = ({
  currentBalance,
  onBalanceUpdate,
  open,
  onOpenChange,
  hideTrigger = false,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const isControlled = typeof open === 'boolean';
  const isOpen = isControlled ? Boolean(open) : internalIsOpen;

  const setIsOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

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
      {!hideTrigger && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-900 shadow-sm px-3 py-2 border border-gray-200 transition-all h-auto"
        >
          <Wallet className="w-4 h-4" />
          <span className="text-sm font-semibold whitespace-nowrap">{formattedBalance}</span>
        </Button>
      )}

      {/* Top-up Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md w-[92vw] bg-gray-50 border border-gray-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-center text-gray-900">Bakiye İşlemleri</DialogTitle>
            <DialogDescription className="text-center text-gray-600">Hesabınıza bakiye yükleyin</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Balance */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-200">
              <span className="text-sm font-medium text-gray-700">Mevcut Bakiye</span>
              <div className="flex items-center gap-2">
                {isCheckingBalance ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                ) : (
                  <span className="font-semibold text-gray-900">{formattedBalance}</span>
                )}
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="topup-amount" className="text-gray-700 font-medium">Yüklenecek Miktar (UZS)</Label>
              <Input
                id="topup-amount"
                type="number"
                placeholder="Örnek: 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1000"
                step="1000"
                className="text-center text-lg focus-visible:ring-0 focus-visible:ring-offset-0 border-gray-300 text-gray-900 bg-white rounded-xl"
              />
              {amountValue > 0 && (
                <div className="text-center text-sm text-gray-600">
                  Yüklenecek: {formattedAmount}
                </div>
              )}
            </div>

            {/* Validation Messages */}
            {amountValue > 0 && amountValue < 1000 && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>Minimum yükleme miktarı 1,000 UZS</span>
              </div>
            )}

            {amountValue >= 1000 && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                <span>Miktar geçerli</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                onClick={handleTopUp}
                disabled={isLoading || amountValue < 1000}
                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all"
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
                className="w-full h-11 border-gray-300 bg-white text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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
