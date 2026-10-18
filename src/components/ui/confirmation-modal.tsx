import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Evet, Gönder",
  cancelText = "İptal",
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#242424]/35 px-4"
        onClick={() => {
          if (!isLoading) onClose();
        }}
      >
        <div
          className="w-full max-w-sm rounded-lg border border-[#dededb] bg-white p-5 text-[#37352f] shadow-[0_16px_48px_rgba(15,15,15,0.18)]"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-modal-title"
          aria-describedby="confirmation-modal-message"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f1f1ef] text-[#5f5e5a]">
                <AlertTriangle className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <h3
                id="confirmation-modal-title"
                className="text-[17px] font-semibold leading-6 text-[#242424]"
              >
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[#787774] transition-colors hover:bg-[#f1f1ef] hover:text-[#37352f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881]"
              disabled={isLoading}
              aria-label="Pencereyi kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <p
            id="confirmation-modal-message"
            className="mt-3 text-sm font-normal leading-6 text-[#5f5e5a]"
          >
            {message}
          </p>
          
          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="h-9 rounded-md border-[#dededb] bg-white px-3.5 text-sm font-medium text-[#37352f] hover:bg-[#f7f7f5]"
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="h-9 rounded-md bg-red-600 px-3.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Gönderiliyor...
                </div>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </div>
  );
}
