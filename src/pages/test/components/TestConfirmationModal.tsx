import { BellOff, Check, Clock3, Headphones, Wifi, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import "./TestModal.css";
import "./TestConfirmationModal.css";

interface TestConfirmationModalProps {
  sourcePicker?:ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  replacesActiveSession?: boolean;
  restartActiveSession?: boolean;
  isStarting?: boolean;
}

const CHECK_ITEMS = [
  {
    icon: Headphones,
    title: "Ortam",
    text: "Sessiz, dikkatinizin dağılmayacağı bir ortam seçin.",
  },
  {
    icon: Wifi,
    title: "Bağlantı ve şarj",
    text: "İnternet bağlantınızı ve cihazınızın şarjını kontrol edin.",
  },
  {
    icon: BellOff,
    title: "Bildirimler",
    text: "Sınav sırasında bölünmemek için bildirimlerinizi kapatın.",
  },
  {
    icon: Clock3,
    title: "Sınav süresi",
    text: "Sınav başladıktan sonra geri dönemezsiniz ve süreyi durduramazsınız.",
  },
] as const;

const TestConfirmationModal = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  replacesActiveSession = false,
  restartActiveSession = false,
  isStarting = false,
  sourcePicker,
}: TestConfirmationModalProps) => {
  const [isAgreed, setIsAgreed] = useState(false);

  useEffect(() => {
    if (!open) setIsAgreed(false);
  }, [open]);

  const handleConfirm = () => {
    if (isAgreed && !isStarting) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (isStarting) return;
    setIsAgreed(false);
    onOpenChange(false);
    onCancel();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleCancel(); }}>
      <Dialog.Portal>
      <Dialog.Overlay className="test-section-overlay test-confirmation-overlay" />
      <Dialog.Content
        data-test-confirmation-modal
        aria-describedby={undefined}
        className="test-section-dialog test-confirmation-dialog"
        onEscapeKeyDown={(event) => { if (isStarting) event.preventDefault(); }}
        onInteractOutside={(event) => { if (isStarting) event.preventDefault(); }}
      >
        <div className="test-section-header">
          <Dialog.Title asChild><h2>Dikkat</h2></Dialog.Title>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isStarting}
            className="test-section-close"
            aria-label="Pencereyi kapat"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="test-section-body test-confirmation-body">
          {sourcePicker}
          {replacesActiveSession && (
            <div className="test-confirmation-session-warning">
              <h3>
                {restartActiveSession
                  ? "Devam eden sınav kapatılacak"
                  : "Önceki sınavın dönüş süresi doldu"}
              </h3>
              <p>
                {restartActiveSession
                  ? "Devam ederseniz mevcut deneme kapanır ve yeni bir deneme açılır."
                  : "Önceki denemeye kaldığınız yerden devam edemezsiniz. Yeni bir deneme başlatabilirsiniz."}
              </p>
            </div>
          )}

          <ul className="test-confirmation-checks">
            {CHECK_ITEMS.map(({ icon: Icon, title, text }) => (
              <li
                key={text}
                className="test-confirmation-item"
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
          <label className="test-confirmation-agreement" data-agreed={isAgreed || undefined}>
            <span className="test-confirmation-agreement-control">
              <input
                type="checkbox"
                checked={isAgreed}
                disabled={isStarting}
                onChange={(event) => setIsAgreed(event.target.checked)}
              />
              <Check size={13} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span>Okudum, hazırım.</span>
          </label>
        </div>

        <div className="test-section-footer test-confirmation-footer">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isStarting}
            className="test-confirmation-back"
          >
            Geri dön
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isAgreed || isStarting}
            className="test-section-start"
          >
            {isStarting
              ? "Hazırlanıyor…"
              : replacesActiveSession
                ? "Yeni sınavı başlat"
                : "Devam et"}
          </button>
        </div>
      </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default TestConfirmationModal;
