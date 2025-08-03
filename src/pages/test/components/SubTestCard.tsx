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
        backgroundImage:
          "https://images.unsplash.com/photo-1583394838336-acd97773b5o=format&q=80",
        altText: "Listening Test - Dinleme Testi",
      };
    case "speaking":
      return {
        label: "Konuşma",
        icon: Mic,
        backgroundImage:
          "https://images.unsplash.com/photo-1516280440614-37939bbacd250&fit=crop&auto=format&q=80",
        altText: "Speaking Test - Konuşma Testi",
      };
    case "reading":
      return {
        label: "Okuma",
        icon: BookOpen,
        backgroundImage:
          "https://images.unsplash.com/photo-1481627834876-bw=400&h=250&fit=crop&auto=format&q=80",
        altText: "Reading Test - Okuma Testi",
      };
    case "writing":
    case "academic":
      return {
        label: "Yazma",
        icon: PenTool,
        backgroundImage:
          "https://images.unsplash.com/photo-1455390582262-044cdeadh=250&fit=crop&auto=format&q=80",
        altText: "Writing Test - Yazma Testi",
      };
    default:
      return {
        label: type,
        icon: BookOpen,
        backgroundImage:
          "https://images.unsplash.com/photo-14816278348760?w=400&h=250&fit=crop&auto=format&q=80",
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

  return (
    <Card
      key={subTest.id}
      className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-red-100 hover:border-red-200 h-[320px] flex flex-col"
    >
      <div className="relative flex-shrink-0">
        <img
          src={typeInfo.backgroundImage}
          alt={typeInfo.altText}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-white/90 text-gray-700">
            <Clock className="h-3 w-3 mr-1" />
            {typeInfo.label}
          </Badge>
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
            onClick={handleStartTest}
            className="w-full bg-red-600 hover:bg-red-700 text-white cursor-pointer"
          >
            Teste Başla
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubTestCard;
