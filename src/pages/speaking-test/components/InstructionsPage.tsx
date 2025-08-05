import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

interface InstructionsPageProps {
  testTitle: string;
  onStartTest: () => void;
}

const InstructionsPage = ({ testTitle, onStartTest }: InstructionsPageProps) => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {testTitle}
            </h1>
            <p className="text-gray-600">
              Konuşma testine başlamak için aşağıdaki butona tıklayın.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-800 mb-3">Test Kuralları:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Her soru için kayıt butonuna tıklayın</li>
              <li>• Net ve anlaşılır konuşun</li>
              <li>• Sessiz bir ortamda test olun</li>
              <li>• Tüm soruları cevapladıktan sonra gönderin</li>
            </ul>
          </div>

          <div className="text-center">
            <Button
              onClick={onStartTest}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3"
            >
              Teste Başla
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructionsPage; 