import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (message: string) => {
    return sonnerToast.success(message, {
      style: {
        backgroundColor: "#22c55e", // green-500
        color: "#ffffff", // white text
        border: "1px solid #16a34a", // green-600 border
      },
    });
  },

  error: (message: string) => {
    return sonnerToast.error(message, {
      style: {
        backgroundColor: "#ef4444", // red-500
        color: "#ffffff", // white text
        border: "1px solid #dc2626", // red-600 border
      },
    });
  },

  info: (message: string) => {
    return sonnerToast.info(message, {
      style: {
        backgroundColor: "#3b82f6", // blue-500
        color: "#ffffff", // white text
        border: "1px solid #2563eb", // blue-600 border
      },
    });
  },

  // Keep the default toast for other cases
  default: sonnerToast,
};
