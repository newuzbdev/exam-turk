import { X, Headphones, Wifi, AlertCircle, Check } from "lucide-react";
import { useState } from "react";

interface TestConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const TestConfirmationModal = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: TestConfirmationModalProps) => {
  const [isAgreed, setIsAgreed] = useState(false);

  if (!open) return null;

  const handleConfirm = () => {
    if (isAgreed) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    setIsAgreed(false);
    onCancel();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] animate-in fade-in"
      onClick={() => {
        setIsAgreed(false);
        onOpenChange(false);
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide bg-red-50 text-red-600 border border-red-100">
                ÖNEMLİ
              </span>
            </div>
            <button
              onClick={() => {
                setIsAgreed(false);
                onOpenChange(false);
              }}
              className="text-gray-400 hover:text-gray-800 transition-colors"
              aria-label="Modalı kapat"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <h2 className="font-serif text-3xl font-bold text-gray-900 mt-4">
            Sınava başlamadan önce
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Kısa bir kontrol listesi ile sorunsuz bir oturum başlatın.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-gray-600 mb-6 leading-relaxed">
            Bu sınav, gerçek bir CEFR oturumunu yansıtacak şekilde tasarlanmıştır.
            Lütfen başlamadan önce aşağıdaki maddeleri kontrol ediniz.
          </p>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50/60">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                    <Headphones className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Sessiz bir ortam seçin
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Bildirimleri kapatın, mümkünse kulaklık kullanın ve sınav
                    süresince bölünmeyeceğiniz bir yer tercih edin.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50/60">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                    <Wifi className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Ses ve internet bağlantısını kontrol edin
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Ses düzeyini ayarlayın, cihazınızın ses çıkışını test edin ve
                    bağlantınızın stabil olduğundan emin olun.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50/60">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Geri dönüş yok
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Başladıktan sonra süre durdurulamaz. Sayfayı kapatırsanız
                    sınava geri dönemezsiniz.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                    isAgreed
                      ? "bg-red-600 border-red-600"
                      : "bg-white border-gray-300 group-hover:border-red-300"
                  }`}
                >
                  {isAgreed && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
              <span className="text-sm text-gray-700 font-medium">
                Kuralları okudum ve hazır olduğumu onaylıyorum.
              </span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50/50">
          <div className="flex gap-4">
            <button
              onClick={handleCancel}
              className="flex-1 border-2 border-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg hover:border-gray-400 hover:bg-gray-100 transition-colors"
            >
              Geri Dön
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isAgreed}
              className="flex-1 bg-red-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg shadow-red-600/20 transition-all hover:-translate-y-0.5 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              Sınava Başla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestConfirmationModal;
