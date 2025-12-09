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
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-medium">UYARI</span>
            </div>
            <button 
              onClick={() => {
                setIsAgreed(false);
                onOpenChange(false);
              }}
              className="text-gray-400 hover:text-gray-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <h2 className="font-serif text-3xl font-bold text-gray-900 mt-4">
            Sınava Başlamadan Önce
          </h2>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-gray-600 mb-6 leading-relaxed">
            Bu sınav, gerçek bir CEFR sınav oturumunu birebir yansıtacak şekilde tasarlanmıştır. 
            Lütfen başlamadan önce aşağıdaki maddeleri dikkatle kontrol edin.
          </p>

          <div className="space-y-6">
            {/* Instruction 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-lg bg-gray-100">
                  <Headphones className="w-6 h-6 text-gray-700" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">Sessiz bir ortam seçin</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Bildirimleri kapatın, en iyi deneyim için kulaklığınızı takın ve sınav süresince 
                  bölünmeyeceğiniz bir yer tercih edin.
                </p>
              </div>
            </div>

            {/* Instruction 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-lg bg-gray-100">
                  <Wifi className="w-6 h-6 text-gray-700" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">Ses ve internet bağlantısını kontrol edin</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Ses düzeyini ayarlayın, kulaklık veya hoparlörün çalıştığından ve internet 
                  bağlantınızın stabil olduğundan emin olun.
                </p>
              </div>
            </div>

            {/* Instruction 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-lg bg-gray-100">
                  <AlertCircle className="w-6 h-6 text-gray-700" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">Geri dönüş yok</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Başladıktan sonra süre durdurulamaz, sayfayı kapatırsanız sınava geri dönemezsiniz.
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                  isAgreed 
                    ? 'bg-gray-900 border-gray-900' 
                    : 'bg-white border-gray-300 group-hover:border-gray-400'
                }`}>
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
              className="flex-1 bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Geri Dön
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isAgreed}
              className="flex-1 bg-red-500 text-white font-medium py-3 px-6 rounded-lg shadow-lg shadow-red-500/20 transition-all hover:-translate-y-0.5 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:translate-y-0"
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

