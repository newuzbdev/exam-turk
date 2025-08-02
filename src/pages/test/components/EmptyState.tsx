import { BookOpen } from "lucide-react";

type TestType = 'all' | 'listening' | 'speaking' | 'reading' | 'writing';

interface EmptyStateProps {
  selectedTestType: TestType;
  isMainTestSelection?: boolean;
}

const EmptyState = ({ selectedTestType, isMainTestSelection = false }: EmptyStateProps) => {
  const testTypes = [
    { id: 'all', name: 'Tüm Testler' },
    { id: 'listening', name: 'Dinleme' },
    { id: 'speaking', name: 'Konuşma' },
    { id: 'reading', name: 'Okuma' },
    { id: 'writing', name: 'Yazma' },
  ];

  const getEmptyMessage = () => {
    if (isMainTestSelection) {
      return {
        title: 'Henüz test bulunmuyor',
        description: 'Türkçe testleri yakında eklenecek.'
      };
    }

    if (selectedTestType === 'all') {
      return {
        title: 'Bu test için henüz alt test bulunmuyor',
        description: 'Bu test türü için içerik yakında eklenecek.'
      };
    }

    const testTypeName = testTypes.find(t => t.id === selectedTestType)?.name;
    return {
      title: `${testTypeName} testi bulunmuyor`,
      description: 'Bu test türü için içerik yakında eklenecek.'
    };
  };

  const message = getEmptyMessage();

  return (
    <div className="text-center py-12">
      <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {message.title}
      </h3>
      <p className="text-gray-500">
        {message.description}
      </p>
    </div>
  );
};

export default EmptyState;
