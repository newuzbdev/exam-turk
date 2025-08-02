import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Headphones, Mic, BookOpen, PenTool } from "lucide-react";

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
    case 'listening':
      return { label: 'Dinleme', icon: Headphones };
    case 'speaking':
      return { label: 'Konuşma', icon: Mic };
    case 'reading':
      return { label: 'Okuma', icon: BookOpen };
    case 'writing':
    case 'academic':
      return { label: 'Yazma', icon: PenTool };
    default:
      return { label: type, icon: BookOpen };
  }
};

const SubTestCard = ({ subTest, getTestTypeImage,  }: SubTestCardProps) => {
  const typeInfo = getTypeInfo(subTest.type);

  return (
    <Card key={subTest.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-red-100 hover:border-red-200 cursor-pointer">
      <div className="relative">
        <img
          src={getTestTypeImage(subTest.type)}
          alt={subTest.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-white/90 text-gray-700">
            <Clock className="h-3 w-3 mr-1" />
            {typeInfo.label}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <typeInfo.icon className="h-6 w-6 text-red-600" />
          <h3 className="text-xl font-semibold text-gray-900">
            {typeInfo.label}
          </h3>
        </div>

        <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
          Teste Başla
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubTestCard;
