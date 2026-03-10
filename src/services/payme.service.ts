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
  status: "pending" | "completed" | "failed" | "cancelled";
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

export interface UnifiedProductCheckoutResponse {
  status: "COMPLETED" | "PAYMENT_REQUIRED";
  requiresPayment: boolean;
  message?: string;
  checkoutUrl?: string;
  requiredBalance?: number;
  transaction?: ProductPurchaseResponse["transaction"];
}

// Pricing plan to product mapping
export const PRICING_PRODUCTS = {
  quick: "3d232477-38c7-422c-8e5f-be82dd3bb99b",
  intensive: "3d232477-38c7-422c-8e5f-be82dd3bb99b",
  expert: "3d232477-38c7-422c-8e5f-be82dd3bb99b",
  test: "3d232477-38c7-422c-8e5f-be82dd3bb99b",
} as const;

const FALLBACK_PRODUCT_ID = "00000000-0000-0000-0000-000000000000";

const extractApiErrorMessage = (error: any, fallback: string): string => {
  const msg =
    (typeof error?.response?.data?.message === "string" &&
      error.response.data.message) ||
    (typeof error?.response?.data?.error === "string" &&
      error.response.data.error) ||
    (typeof error?.response?.data?.data?.message === "string" &&
      error.response.data.data.message) ||
    (typeof error?.response?.data?.data?.error === "string" &&
      error.response.data.data.error) ||
    (typeof error?.message === "string" && error.message);

  return msg || fallback;
};

const normalizeTransactionStatus = (
  value: unknown
): PaymeTransactionStatus["status"] => {
  const normalized = String(value ?? "").toLowerCase().trim();

  if (
    normalized === "completed" ||
    normalized === "success" ||
    normalized === "paid" ||
    normalized === "done" ||
    normalized === "2"
  ) {
    return "completed";
  }

  if (
    normalized === "failed" ||
    normalized === "error" ||
    normalized === "rejected" ||
    normalized === "-1"
  ) {
    return "failed";
  }

  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "cancel" ||
    normalized === "-2"
  ) {
    return "cancelled";
  }

  return "pending";
};

const extractCheckoutData = (payload: any) => {
  const root = payload && typeof payload === "object" ? payload : {};
  const nested = root.data && typeof root.data === "object" ? root.data : {};
  const result =
    root.result && typeof root.result === "object" ? root.result : {};
  const nestedResult =
    nested.result && typeof nested.result === "object" ? nested.result : {};

  const checkoutUrl =
    result.url ||
    nestedResult.url ||
    root.url ||
    nested.url ||
    root.checkoutUrl ||
    nested.checkoutUrl;

  const transactionId =
    result.transactionId ||
    nestedResult.transactionId ||
    root.transactionId ||
    nested.transactionId;

  return {
    checkoutUrl: checkoutUrl ? String(checkoutUrl) : "",
    transactionId: transactionId ? String(transactionId) : "",
  };
};

const buildTransactionStatus = (
  transactionId: string,
  payload: any
): PaymeTransactionStatus => {
  const root = payload && typeof payload === "object" ? payload : {};
  const data = root.data && typeof root.data === "object" ? root.data : root;
  const transaction =
    data.transaction && typeof data.transaction === "object"
      ? data.transaction
      : {};

  const rawStatus =
    data.status ?? transaction.status ?? data.state ?? data.result?.status;
  const amountRaw =
    data.amount ?? transaction.amount ?? data.result?.amount ?? data.sum ?? 0;
  const amount = Number(amountRaw);

  return {
    success: true,
    status: normalizeTransactionStatus(rawStatus),
    transactionId: String(
      data.transactionId || transaction.id || data.id || transactionId
    ),
    amount: Number.isFinite(amount) ? amount : 0,
    message: data.message || data.result?.message,
  };
};

const containsInsufficientBalanceHint = (value: unknown) => {
  const normalized = String(value || "").toLowerCase();
  return (
    normalized.includes("insufficient") ||
    normalized.includes("not enough") ||
    normalized.includes("yetarli emas") ||
    normalized.includes("yetersiz") ||
    normalized.includes("balans") ||
    normalized.includes("bakiye")
  );
};

const pickProductId = (
  planId: string,
  products: unknown
): string => {
  const mappedProductId =
    PRICING_PRODUCTS[planId as keyof typeof PRICING_PRODUCTS];
  const normalizedProducts = Array.isArray(products)
    ? (products as Array<{ id?: string }>)
    : [];

  const selected =
    normalizedProducts.find((item) => item?.id === mappedProductId) ||
    normalizedProducts[0];

  return selected?.id || mappedProductId || FALLBACK_PRODUCT_ID;
};

// Payme service for handling payment operations
export const paymeService = {
  // Initialize checkout process with Payme
  initiateCheckout: async (balance: number): Promise<PaymeCheckoutResponse> => {
    try {
      const response = await axiosPrivate.post(paymeEndPoint.checkout, { balance });
      const { checkoutUrl, transactionId } = extractCheckoutData(response?.data);

      if (!checkoutUrl) {
        return {
          success: false,
          message: "Checkout URL not found in response",
        };
      }

      return {
        success: true,
        result: {
          url: checkoutUrl,
          transactionId,
          balance,
        },
        data: {
          checkoutUrl,
          transactionId,
          balance,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: extractApiErrorMessage(
          error,
          "Odeme islemi sirasinda hata olustu"
        ),
      };
    }
  },

  // Get user's Payme balance
  getBalance: async (): Promise<PaymeBalanceResponse> => {
    try {
      const response = await axiosPrivate.get(paymeEndPoint.balance);
      const payload = response?.data?.data || response?.data || {};
      const balance = Number(payload?.balance ?? payload?.amount ?? 0);

      return {
        success: true,
        balance: Number.isFinite(balance) ? balance : 0,
        currency: "UZS",
      };
    } catch {
      return {
        success: false,
        balance: 0,
      };
    }
  },

  // Check transaction status
  checkTransactionStatus: async (
    transactionId: string
  ): Promise<PaymeTransactionStatus> => {
    try {
      const response = await axiosPrivate.get(
        paymeEndPoint.transaction(transactionId)
      );
      return buildTransactionStatus(transactionId, response?.data);
    } catch {
      try {
        const verifyResponse = await axiosPrivate.post(paymeEndPoint.verify, {
          transactionId,
        });
        return buildTransactionStatus(transactionId, verifyResponse?.data);
      } catch (error: any) {
        return {
          success: false,
          status: "failed",
          transactionId,
          amount: 0,
          message: extractApiErrorMessage(
            error,
            "Islem durumu kontrol edilemedi"
          ),
        };
      }
    }
  },

  // Verify payment completion
  verifyPayment: async (transactionId: string): Promise<boolean> => {
    try {
      const status = await paymeService.checkTransactionStatus(transactionId);
      return status.success && status.status === "completed";
    } catch {
      return false;
    }
  },

  // Format balance for display
  formatBalance: (balance: number): string => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "UZS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
      const response = await axiosPrivate.get("/api/product");
      const list = response?.data?.data || response?.data || [];
      const arr = Array.isArray(list)
        ? list
        : Array.isArray(list?.data)
          ? list.data
          : [];
      return arr;
    } catch {
      return [];
    }
  },

  // Single-flow checkout: backend decides whether direct purchase or Payme top-up is needed.
  checkoutProductSingleFlow: async (
    planId: string,
    units: number
  ): Promise<UnifiedProductCheckoutResponse> => {
    const products = await paymeService.getAllProducts();
    const productId = pickProductId(planId, products);

    const response = await axiosPrivate.post("/api/product/checkout", {
      amount: units,
      productId,
    });

    return (response?.data?.data ||
      response?.data ||
      {}) as UnifiedProductCheckoutResponse;
  },

  // Purchase product after successful Payme payment
  purchaseProduct: async (
    planId: string,
    units: number
  ): Promise<ProductPurchaseResponse> => {
    try {
      const products = await paymeService.getAllProducts();
      const productId = pickProductId(planId, products);

      const response = await axiosPrivate.post("/api/product/purchase", {
        amount: units,
        productId,
      });

      toast.success("Mahsulot muvaffaqiyatli sotib olindi!");
      return response.data;
    } catch (error: any) {
      const errorMessage = extractApiErrorMessage(
        error,
        "Mahsulot sotib olishda xatolik yuz berdi"
      );
      toast.error(errorMessage);
      throw error;
    }
  },

  isInsufficientBalanceError: (error: any): boolean => {
    const status = Number(error?.response?.status);
    if (status === 402 || status === 409) return true;

    return (
      containsInsufficientBalanceHint(error?.response?.data?.message) ||
      containsInsufficientBalanceHint(error?.response?.data?.error) ||
      containsInsufficientBalanceHint(error?.response?.data?.data?.message) ||
      containsInsufficientBalanceHint(error?.message)
    );
  },
};

