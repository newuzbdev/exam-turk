import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, Mic, PenTool } from "lucide-react";

type TestType = "all" | "listening" | "speaking" | "reading" | "writing";

interface TestTypeSelectorProps {
  selectedTestType: TestType;
  setSelectedTestType: (type: TestType) => void;
}

const TestTypeSelector = ({
  selectedTestType,
  setSelectedTestType,
}: TestTypeSelectorProps) => {
  const testTypes = [
    {
      id: "all",
      name: "Tüm Testler",
      icon: BookOpen,
      color: "text-black",
      bgColor: "bg-gray-50",
    },
    {
      id: "listening",
      name: "Dinleme",
      icon: Headphones,
      color: "text-black",
      bgColor: "bg-white-50",
    },
    {
      id: "speaking",
      name: "Konuşma",
      icon: Mic,
      color: "text-black",
      bgColor: "",
    },
    {
      id: "reading",
      name: "Okuma",
      icon: BookOpen,
      color: "text-black",
      bgColor: "bg-white",
    },
    {
      id: "writing",
      name: "Yazma",
      icon: PenTool,
      color: "text-black",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {testTypes.map((type) => {
          const IconComponent = type.icon;
          return (
            <Button
              key={type.id}
              variant={selectedTestType === type.id ? "default" : "outline"}
              className={`h-32 flex flex-col items-center justify-center gap-4 ${
                selectedTestType === type.id
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "hover:bg-gray-50 text-red-600 border-red-200"
              }`}
              onClick={() => setSelectedTestType(type.id as TestType)}
            >
              <IconComponent className="h-16 w-16" />
              <span className="text-xl font-bold">{type.name}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default TestTypeSelector;
