import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PaymeCheckoutModal from '@/components/payme/PaymeCheckoutModal';

const TestPaymePage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Payme Test Page</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          Test Payme Checkout
        </Button>
        
        <PaymeCheckoutModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          planName="Test Plan"
          planId="test"
          onSuccess={(transactionId) => {
            console.log('Payment successful:', transactionId);
            setIsModalOpen(false);
          }}
        />
      </div>
    </div>
  );
};

export default TestPaymePage;
