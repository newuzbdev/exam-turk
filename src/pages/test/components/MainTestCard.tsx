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
    navigate("/test", {
      state: {
        selectedTestId: test.id,
        selectedTestType: testType,
      },
    });
  };

  const availableTypes = getAvailableTypes();
  return (
    <Card
      key={test.id}
      className="overflow-visible flex flex-col hover:shadow-lg transition-shadow duration-200  shadow-md rounded-xl"
    >
      <div className="relative flex-shrink-1">
        <div className="w-full h-48 bg-gray-100 rounded-t-xl flex flex-col items-center justify-center cursor-pointer border-b">
          <div className="flex items-center gap-4 mb-3 px-4">
            {availableTypes.map((type, index) => {
              const IconComponent = type.icon;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform flex-1"
                  onClick={() => handleTestTypeClick(type.type)}
                >
                  <div className="bg-white rounded-lg p-3 mb-2 shadow-sm border">
                    <IconComponent className="h-8 w-8 text-gray-700" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 text-center">
                    {type.name}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="absolute top-4 right-4">
            <Badge
              variant="secondary"
              className="bg-white text-gray-600 border"
            >
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
                    className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors border border-red-200"
                    onClick={() => handleTestTypeClick(type.type)}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{type.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* <div className="bg-red-50 rounded-lg p-5 mb-4 border border-red-200">
            <div className="flex items-center justify-between">
              <span className="text-base text-red-600">Toplam Test Türü</span>
              <span className="text-xl font-bold text-red-700">
                {availableTypes.length}
              </span>
            </div>
          </div> */}
        </div>

        {/* Main Enter Test Button */}
        <Button
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 mt-4 shadow-md text-lg"
          onClick={() => {
            console.log("Available test types:", availableTestTypes);
            console.log("Speaking tests:", availableTestTypes.speaking);
            const speakingTest = availableTestTypes.speaking[0];
            if (speakingTest) {
              navigate(`/speaking-test/${speakingTest.id}`);
            } else {
              console.log("No speaking test found");
            }
          }}
        >
          🎯 Testni Başla
        </Button>
      </CardContent>
    </Card>
  );
};

export default MainTestCard;
