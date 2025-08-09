import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Headphones, Mic, BookOpen, PenTool } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TurkishTest {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface WritingTest {
  id: string;
  title: string;
  ieltsId: string;
  type: string;
}

interface SpeakingTest {
  id: string;
  title: string;
  ieltsId: string;
  type: string;
}

interface ListeningTest {
  id: string;
  title: string;
  ieltsId: string;
  type: string;
}

interface ReadingTest {
  id: string;
  title: string;
  ieltsId: string;
  type: string;
}

interface MainTestCardProps {
  test: TurkishTest;
  onTestStart: (test: TurkishTest) => void;
  getTestImage: () => string;
  formatDate: (dateString: string) => string;
  availableTestTypes: {
    writing: WritingTest[];
    speaking: SpeakingTest[];
    listening: ListeningTest[];
    reading: ReadingTest[];
  };
}

const MainTestCard = ({
  test,
  onTestStart,
  availableTestTypes,
}: MainTestCardProps) => {
  const navigate = useNavigate();

  const getAvailableTypes = () => {
    const types = [];
    if (availableTestTypes.listening.length > 0) {
      types.push({
        name: "Dinleme",
        icon: Headphones,
        type: "listening",
      });
    }
    if (availableTestTypes.speaking.length > 0) {
      types.push({ name: "Konuşma", icon: Mic, type: "speaking" });
    }
    if (availableTestTypes.reading.length > 0) {
      types.push({ name: "Okuma", icon: BookOpen, type: "reading" });
    }
    if (availableTestTypes.writing.length > 0) {
      types.push({ name: "Yazma", icon: PenTool, type: "writing" });
    }
    return types;
  };

  const handleTestTypeClick = (testType: string) => {
    // Navigate to the test page with the specific test type selected
    navigate("/test", {
      state: {
        selectedTestId: test.id,
        selectedTestType: testType,
      },
    });
  };

  const availableTypes = getAvailableTypes();
  return (
    <Card className="overflow-visible flex flex-col shadow-xl rounded-xl border border-gray-200 bg-white cursor-pointer">
      <div className="relative flex-shrink-1">
        <div className="w-full h-48 rounded-t-xl overflow-hidden border-b border-gray-100 relative">
          <img
            src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=250&fit=crop&auto=format"
            alt="Test"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-white text-gray-600 shadow-md border border-gray-200">
              <Clock className="h-4 w-4 mr-1" />
              {availableTypes.length} Tür
            </Badge>
          </div>
        </div>
      </div>

      <CardContent className="p-6 flex-1 flex flex-col">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">{test.title}</h3>

        <div className="flex-1">
          <div className="mb-6">
            <p className="text-base text-gray-600 mb-4">Mevcut test türleri:</p>
            <div className="grid grid-cols-2 gap-3">
              {availableTypes.map((type, index) => {
                const IconComponent = type.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer border border-red-200"
                    onClick={() => handleTestTypeClick(type.type)}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{type.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Test Start Button */}
        <Button
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 mt-6 shadow-xl text-xl rounded-lg border-2 border-red-700"
          onClick={() => onTestStart(test)}
        >
          🎯 Test Başla
        </Button>
      </CardContent>
    </Card>
  );
};

export default MainTestCard;
