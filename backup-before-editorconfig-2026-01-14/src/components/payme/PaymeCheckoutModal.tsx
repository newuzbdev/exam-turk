import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import PaymeCheckout from './PaymeCheckout';

interface PaymeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planId: string;
  onSuccess?: (transactionId: string, purchaseData?: any) => void;
  initialUnits?: number;
}

export const PaymeCheckoutModal: React.FC<PaymeCheckoutModalProps> = ({
  isOpen,
  onClose,
  planName,
  planId,
  onSuccess,
  initialUnits
}) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string>('');

  const handleSuccess = (txId: string, purchaseData?: any) => {
    setTransactionId(txId);
    setIsSuccess(true);
    onSuccess?.(txId, purchaseData);
  };

  const handleClose = () => {
    setIsSuccess(false);
    setTransactionId('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl w-[96vw] max-h-[85vh] overflow-y-auto p-0 border border-gray-200 bg-gray-50">
        <DialogHeader>
          <div className="flex items-center justify-between px-4 pt-4">
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                {isSuccess ? 'İşlem Başarılı!' : 'Kredi İşlemleri'}
              </DialogTitle>
              <DialogDescription className="mt-1 text-gray-600">
                {isSuccess
                  ? `İşleminiz başarıyla tamamlandı`
                  : 'Satın almak istediğiniz kredi sayısını seçin'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4">
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Tebrikler!
                </h3>
                <p className="text-gray-600">
                  Kredileriniz hesabınıza başarıyla eklendi
                </p>
                {transactionId && (
                  <Badge variant="outline" className="text-xs">
                    İşlem ID: {transactionId}
                  </Badge>
                )}
              </div>

              <Button onClick={handleClose} className="w-full">
                Tamam
              </Button>
            </div>
          ) : (
            <PaymeCheckout
              planName={planName}
              planId={planId}
              onSuccess={handleSuccess}
              onCancel={handleClose}
              initialUnits={initialUnits}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymeCheckoutModal;