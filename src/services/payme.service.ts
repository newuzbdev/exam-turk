import axiosPrivate from "@/config/api";
import { paymeEndPoint } from "@/config/endpoint";
import { toast } from "@/utils/toast";

// Payme API interfaces
export interface PaymeCheckoutRequest {
  balance: number;
}

export interface PaymeCheckoutResponse {
  success: boolean;
  message?: string;
  result?: {
    url?: string;
    transactionId?: string;
    balance?: number;
  };
  data?: {
    checkoutUrl?: string;
    transactionId?: string;
    balance?: number;
  };
}

export interface PaymeBalanceResponse {
  success: boolean;
  balance: number;
  currency?: string;
}

export interface PaymeTransactionStatus {
  success: boolean;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionId: string;
  amount: number;
  message?: string;
}

// Product Purchase API interfaces
export interface ProductPurchaseRequest {
  amount: number;
  productId: string;
}

export interface ProductPurchaseResponse {
  message: string;
  transaction: {
    id: string;
    amount: number;
    price: number;
    totalPrice: number;
    productId: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
  };
}

// Pricing plan to product mapping
export const PRICING_PRODUCTS = {
  'quick': '3d232477-38c7-422c-8e5f-be82dd3bb99b', // stars product
  'intensive': '3d232477-38c7-422c-8e5f-be82dd3bb99b', // stars product
  'expert': '3d232477-38c7-422c-8e5f-be82dd3bb99b', // stars product
  'test': '3d232477-38c7-422c-8e5f-be82dd3bb99b', // stars product
} as const;

// Payme service for handling payment operations
export const paymeService = {
  // Initialize checkout process with Payme (Mock implementation for now)
  initiateCheckout: async (balance: number): Promise<PaymeCheckoutResponse> => {
    console.log('=== PAYME SERVICE DEBUG START ===');
    console.log(`Initiating Payme checkout for balance: ${balance}`);
    
    try {
      console.log('Making API call to', paymeEndPoint.checkout);
      console.log('Request payload:', { balance });
      
      const response = await axiosPrivate.post(paymeEndPoint.checkout, { balance });
      
      console.log('API call completed successfully');
      console.log('Raw API response:', response.data);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Response data structure:', JSON.stringify(response.data, null, 2));
      
      // Check if response is successful (201 Created)
      if (response.status === 201) {
        console.log('Response status is 201, processing...');
        
        // Try multiple possible response structures
        const checkoutUrl = response.data.result?.url || 
                           response.data.url || 
                           response.data.data?.url ||
                           response.data.checkoutUrl;
        
        console.log('Extracted checkout URL:', checkoutUrl);
        
        if (checkoutUrl) {
          console.log('Checkout URL found, returning success response');
          return {
            success: true,
            result: {
              url: checkoutUrl,
              transactionId: response.data.result?.transactionId || 
                            response.data.transactionId ||
                            response.data.data?.transactionId,
              balance: balance
            }
          };
        } else {
          console.error('No checkout URL found in response:', response.data);
          return {
            success: false,
            message: 'Checkout URL not found in response'
          };
        }
      } else {
        console.error('Invalid response status:', response.status);
        return {
          success: false,
          message: `Invalid response status: ${response.status}`
        };
      }
    } catch (error: any) {
      console.error('=== PAYME SERVICE ERROR CAUGHT ===');
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      console.error('Error config:', error.config);
      console.error('Full error object:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Ödeme işlemi sırasında hata oluştu';
      
      console.log('Returning error response:', { success: false, message: errorMessage });
      console.log('=== PAYME SERVICE DEBUG END ===');
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  // Get user's Payme balance (Mock implementation for now)
  getBalance: async (): Promise<PaymeBalanceResponse> => {
    try {
      console.log('Fetching Payme balance...');
      
      const response = await axiosPrivate.get(paymeEndPoint.balance);
      
      console.log('Payme balance response:', response.data);
      return {
        success: true,
        balance: response.data.balance || 0,
        currency: 'UZS'
      };
    } catch (error: any) {
      console.error('Payme balance error:', error);
      
      return {
        success: false,
        balance: 0
      };
    }
  },

  // Check transaction status (Mock implementation for now)
  checkTransactionStatus: async (transactionId: string): Promise<PaymeTransactionStatus> => {
    try {
      console.log(`Checking transaction status for: ${transactionId}`);
      
      // Mock implementation - replace with actual API call when backend is ready
      // const response = await axiosPrivate.get(`/api/payme/transaction/${transactionId}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock response - simulate successful completion for demo
      const randomStatus = 'completed'; // Always succeed in demo mode
      
      console.log('Transaction status response (mock):', {
        success: true,
        status: randomStatus,
        transactionId,
        amount: 0
      });
      
      return {
        success: true,
        status: randomStatus,
        transactionId,
        amount: 0
      };
    } catch (error: any) {
      console.error('Transaction status error:', error);
      
      return {
        success: false,
        status: 'failed',
        transactionId,
        amount: 0,
        message: 'İşlem durumu kontrol edilemedi'
      };
    }
  },

  // Verify payment completion
  verifyPayment: async (transactionId: string): Promise<boolean> => {
    try {
      const status = await paymeService.checkTransactionStatus(transactionId);
      
      if (status.success && status.status === 'completed') {
        toast.success('Ödeme başarıyla tamamlandı');
        return true;
      } else if (status.status === 'failed') {
        toast.error('Ödeme başarısız');
        return false;
      } else if (status.status === 'cancelled') {
        toast.error('Ödeme iptal edildi');
        return false;
      } else {
        toast.info('Ödeme işlemi devam ediyor...');
        return false;
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast.error('Ödeme doğrulama sırasında hata oluştu');
      return false;
    }
  },

  // Format balance for display
  formatBalance: (balance: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(balance);
  },

  // Calculate units from balance (assuming 1 unit = 1000 UZS)
  calculateUnitsFromBalance: (balance: number): number => {
    return Math.floor(balance / 1000);
  },

  // Calculate balance from units
  calculateBalanceFromUnits: (units: number): number => {
    return units * 1000;
  },

  // Get all products to see what's available
  getAllProducts: async () => {
    try {
      console.log('Fetching all products...');
      const response = await axiosPrivate.get('/api/product');
      const list = response?.data?.data || response?.data || [];
      const arr = Array.isArray(list) ? list : Array.isArray(list?.data) ? list.data : [];
      console.log('Available products (normalized):', arr);
      return arr;
    } catch (error: any) {
      console.error('Error fetching products:', error);
      return [];
    }
  },

  // Purchase product after successful Payme payment
  purchaseProduct: async (planId: string, units: number): Promise<ProductPurchaseResponse> => {
    try {
      console.log(`Purchasing product for plan: ${planId}, units: ${units}`);
      
      // First, let's get all products to see what's available
      const products = await paymeService.getAllProducts();
      if (products && products.length > 0) {
        console.log('Available products:', products);
        // Use the first available product for now
        const firstProduct = products[0];
        const productId = firstProduct.id;
        console.log(`Using product ID: ${productId}`);
        
        const response = await axiosPrivate.post('/api/product/purchase', {
          amount: units,
          productId: productId
        });

        console.log('Product purchase response:', response.data);
        toast.success('Mahsulot muvaffaqiyatli sotib olindi!');
        
        return response.data;
      } else {
        throw new Error('No products available in the system');
      }
    } catch (error: any) {
      console.error('Product purchase error:', error);
      const errorMessage = error.response?.data?.message || 'Mahsulot sotib olishda xatolik yuz berdi';
      toast.error(errorMessage);
      throw error;
    }
  }
};
