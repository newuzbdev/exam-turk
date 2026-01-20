import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Headphones, Mic, BookOpen, PenTool } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SubTest {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

interface SubTestCardProps {
  subTest: SubTest;
  getTestTypeImage: (type: string) => string;
  formatDate: (dateString: string) => string;
}

const getTypeInfo = (type: string) => {
  switch (type.toLowerCase()) {
    case "listening":
      return {
        label: "Dinleme",
        icon: Headphones,
        backgroundClass: "listening-card",
        altText: "Listening Test - Dinleme Testi",
      };
    case "speaking":
      return {
        label: "Konuşma",
        icon: Mic,
        backgroundClass: "speaking-card",
        altText: "Speaking Test - Konuşma Testi",
      };
    case "reading":
      return {
        label: "Okuma",
        icon: BookOpen,
        backgroundClass: "reading-card",
        altText: "Reading Test - Okuma Testi",
      };
    case "writing":
    case "academic":
      return {
        label: "Yazma",
        icon: PenTool,
        backgroundClass: "writing-card",
        altText: "Writing Test - Yazma Testi",
      };
    default:
      return {
        label: type,
        icon: BookOpen,
        backgroundClass: "default-card",
        altText: "Test",
      };
  }
};

const SubTestCard = ({ subTest }: SubTestCardProps) => {
  const navigate = useNavigate();
  const typeInfo = getTypeInfo(subTest.type);

  const handleStartTest = () => {
    if (subTest.type.toLowerCase() === "speaking") {
      navigate(`/speaking-test/${subTest.id}`);
    } else {
      // Handle other test types here in the future
      console.log(`Starting ${subTest.type} test with ID: ${subTest.id}`);
    }
  };

  const handleCardClick = () => {
    // Navigate back to the main test menu
    navigate('/test');
  };

  return (
    <Card
      key={subTest.id}
      className="overflow-hidden border-red-100 h-[320px] flex flex-col cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="relative flex-shrink-0">
        <div className={`w-full h-48 object-cover ${typeInfo.backgroundClass} flex flex-col items-center justify-center`}>
          <typeInfo.icon className="h-16 w-16 text-red-600 mb-2" />
          <span className="text-xl font-bold text-red-600">{typeInfo.label}</span>
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-white/90 text-gray-700">
              <Clock className="h-3 w-3 mr-1" />
              {typeInfo.label}
            </Badge>
          </div>
        </div>
      </div>

      <CardContent className="p-6 flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <typeInfo.icon className="h-6 w-6 text-red-600" />
          <h3 className="text-xl font-semibold text-gray-900">
            {typeInfo.label}
          </h3>
        </div>

        {/* Button Section - Always at bottom */}
        <div className="mt-auto">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleStartTest();
            }}
            className="w-full bg-red-600 text-white cursor-pointer"
          >
            Teste Başla
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubTestCard;
