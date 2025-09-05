import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Headphones, Mic, BookOpen, PenTool, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import TestInstructionModal from "./TestInstructionModal";

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
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [selectedTestType, setSelectedTestType] = useState<string>("");

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
    setSelectedTestType(testType);
    setShowInstructionModal(true);
  };

  const handleStartTestFromModal = () => {
    // Navigate to the specific test type page
    if (selectedTestType === "speaking") {
      // Find the speaking test ID from available tests
      const speakingTest = availableTestTypes.speaking[0];
      if (speakingTest) {
        navigate(`/speaking-test/${speakingTest.id}`);
      } else {
        console.error("No speaking test available");
      }
    } else if (selectedTestType === "writing") {
      const writingTest = availableTestTypes.writing[0];
      if (writingTest) {
        navigate(`/writing-test/${writingTest.id}`);
      } else {
        console.error("No writing test available");
      }
    } else if (selectedTestType === "listening") {
      const listeningTest = availableTestTypes.listening[0];
      if (listeningTest) {
        navigate(`/listening-test/${listeningTest.id}`);
      } else {
        console.error("No listening test available");
      }
    }
    else {
      // Navigate to the general test page for other test types
      navigate("/test", {
        state: {
          selectedTestId: test.id,
          selectedTestType: selectedTestType,
        },
      });
    }
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
                    className="flex items-center gap-2 bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors"
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
          size="default"
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 mt-6 shadow-lg text-base rounded-lg"
          onClick={() => onTestStart(test)}
        >
          <Play className="w-5 h-5 mr-2" />
          Test Başla
        </Button>
      </CardContent>

      {/* Test Instruction Modal */}
      <TestInstructionModal
        open={showInstructionModal}
        onOpenChange={setShowInstructionModal}
        testType={selectedTestType}
        onStartTest={handleStartTestFromModal}
      />
    </Card>
  );
};

export default MainTestCard;
