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
  onSelect: (test: TurkishTest) => void;
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
  onSelect,
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
    // Use state instead of URL parameters to avoid showing IDs
    navigate('/test', { 
      state: { 
        selectedTestId: test.id, 
        selectedTestType: testType 
      } 
    });
  };

  const availableTypes = getAvailableTypes();
  return (
    <Card
      key={test.id}
      className="overflow-hidden h-[420px] flex flex-col"
    >
      <div className="relative flex-shrink-1">
        <div className="w-full h-48 bg-white flex flex-col items-center justify-center cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            {availableTypes.map((type, index) => {
              const IconComponent = type.icon;
              return (
                <div 
                  key={index} 
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => handleTestTypeClick(type.type)}
                >
                  <IconComponent className="h-12 w-12 text-red-600" />
                  <span className="text-sm font-medium text-red-600 mt-1">
                    {type.name}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-white/90 text-gray-700">
              <Clock className="h-3 w-3 mr-1" />
              {availableTypes.length} Tür
            </Badge>
          </div>
        </div>
      </div>

      <CardContent className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          {test.title}
        </h3>

        {/* Fixed height container for test types */}
        <div className="flex-1 mb-6">
          <div className="flex flex-wrap gap-3">
            {availableTypes.map((type, index) => {
              const IconComponent = type.icon;
              return (
                <div 
                  key={index} 
                  className="flex items-center gap-2 text-base cursor-pointer hover:text-red-600"
                  onClick={() => handleTestTypeClick(type.type)}
                >
                  <IconComponent className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-gray-700">
                    {type.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Button always at bottom */}
        <Button
          className="w-full bg-red-600 hover:bg-red-700 text-white cursor-pointer mt-auto"
          onClick={() => onSelect(test)}
        >
          Test Türlerini Gör
        </Button>
      </CardContent>
    </Card>
  );
};

export default MainTestCard;
