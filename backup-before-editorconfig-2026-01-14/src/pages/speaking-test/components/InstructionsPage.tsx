import { Button } from "@/components/ui/button";

interface InstructionsPageProps {
  testTitle: string;
  onStartTest: () => void;
  sections: Array<{
    title: string;
    description: string;
    type: string;
  }>;
}

const InstructionsPage = ({ testTitle, onStartTest, sections }: InstructionsPageProps) => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
              {testTitle}
            </h1>
            <p className="text-base sm:text-lg text-gray-700">
              Konuşma testine başlamadan önce testin nasıl işlediğini öğrenin.
            </p>
          </div>

          <div className="bg-white rounded-lg p-5 sm:p-6 mb-6 sm:mb-8 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3 sm:mb-4 text-lg sm:text-xl">Test Kuralları:</h3>
            <ul className="space-y-3 text-sm sm:text-base text-gray-700">
              <li className="flex items-start">
                <span className="text-red-500 mr-2 mt-0.5 flex-shrink-0">•</span>
                <span>Her soru için kayıt butonuna tıklayın</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2 mt-0.5 flex-shrink-0">•</span>
                <span>Net ve anlaşılır konuşun</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2 mt-0.5 flex-shrink-0">•</span>
                <span>Sessiz bir ortamda test olun</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2 mt-0.5 flex-shrink-0">•</span>
                <span>Tüm soruları cevapladıktan sonra gönderin</span>
              </li>
            </ul>
          </div>

          <div className="space-y-5 sm:space-y-6 mb-6 sm:mb-8">
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">Test Bölümleri</h3>
            {sections.map((section, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6">
                <div className="flex items-start mb-3 sm:mb-4">
                  <span className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-red-100 text-red-800 rounded-full flex items-center justify-center font-bold text-sm sm:text-base mr-3 sm:mr-4">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base sm:text-lg">{section.title}</h4>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">{section.type}</p>
                  </div>
                </div>
                <div className="pl-2 sm:pl-4">
                  <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line">
                    {section.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-5 sm:p-6 mb-6 sm:mb-8">
            <h3 className="font-semibold text-red-800 mb-3 text-base sm:text-lg">Önemli Hatırlatmalar</h3>
            <ul className="space-y-2 text-sm sm:text-base text-red-700">
              <li className="flex items-start">
                <span className="text-red-500 mr-2 mt-0.5 flex-shrink-0">•</span>
                <span>Her bölümde zaman sınırlamaları vardır, süre bitiminde otomatik olarak bir sonraki bölüme geçilir</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2 mt-0.5 flex-shrink-0">•</span>
                <span>Hazırlanma sürelerinde konuşmayın, sadece soruyu düşünün</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2 mt-0.5 flex-shrink-0">•</span>
                <span>Konuşma sürelerinde net ve anlaşılır bir şekilde cevap verin</span>
              </li>
            </ul>
          </div>

          <div className="text-center">
            <Button
              onClick={onStartTest}
              className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg rounded-lg"
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