import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, Mic, PenTool } from "lucide-react";

type TestType = 'all' | 'listening' | 'speaking' | 'reading' | 'writing';

interface TestTypeSelectorProps {
  selectedTestType: TestType;
  setSelectedTestType: (type: TestType) => void;
}

const TestTypeSelector = ({ selectedTestType, setSelectedTestType }: TestTypeSelectorProps) => {
  const testTypes = [
    { id: 'all', name: 'Tüm Testler', icon: BookOpen, color: 'bg-gray-100 text-gray-700', bgColor: 'bg-gray-50' },
    { id: 'listening', name: 'Dinleme', icon: Headphones, color: 'bg-purple-100 text-purple-700', bgColor: 'bg-purple-50' },
    { id: 'speaking', name: 'Konuşma', icon: Mic, color: 'bg-green-100 text-green-700', bgColor: 'bg-green-50' },
    { id: 'reading', name: 'Okuma', icon: BookOpen, color: 'bg-blue-100 text-blue-700', bgColor: 'bg-blue-50' },
    { id: 'writing', name: 'Yazma', icon: PenTool, color: 'bg-red-100 text-red-700', bgColor: 'bg-red-50' },
  ];

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {testTypes.map((type) => {
          const IconComponent = type.icon;
          return (
            <Button
              key={type.id}
              variant={selectedTestType === type.id ? "default" : "outline"}
              className={`h-20 flex flex-col items-center justify-center gap-2 ${
                selectedTestType === type.id 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedTestType(type.id as TestType)}
            >
              <IconComponent className="h-6 w-6" />
              <span className="text-sm font-medium">{type.name}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default TestTypeSelector;
