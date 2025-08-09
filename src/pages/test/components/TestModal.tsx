import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Headphones, 
  Mic, 
  BookOpen, 
  PenTool, 
  Play,
  Clock,
  Users,
  Target
} from "lucide-react";

interface TurkishTest {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface WritingTest {
  id: string;
  title: string;
  instruction: string;
  type: string;
  ieltsId: string;
  createdAt: string;
  updatedAt: string;
}

interface SpeakingTest {
  id: string;
  title: string;
  ieltsId: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

interface ListeningTest {
  id: string;
  title: string;
  type: string;
  description: string;
  ieltsId: string;
  createdAt: string;
  updatedAt: string;
}

interface ReadingTest {
  id: string;
  title: string;
  type: string;
  description: string;
  ieltsId: string;
  createdAt: string;
  updatedAt: string;
}

interface TestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTest: TurkishTest;
  writingTests: WritingTest[];
  speakingTests: SpeakingTest[];
  listeningTests: ListeningTest[];
  readingTests: ReadingTest[];
  onTestTypeClick: (testType: string, tests: any[]) => void;
}

const TestModal = ({
  open,
  onOpenChange,
  selectedTest,
  writingTests,
  speakingTests,
  listeningTests,
  readingTests,
  onTestTypeClick
}: TestModalProps) => {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const testSections = [
    {
      id: "listening",
      title: "Listening",
      icon: Headphones,
      color: "bg-blue-500 hover:bg-blue-600",
      tests: listeningTests,
      duration: "30 min",
      questions: listeningTests.length
    },
    {
      id: "reading", 
      title: "Reading",
      icon: BookOpen,
      color: "bg-green-500 hover:bg-green-600", 
      tests: readingTests,
      duration: "60 min",
      questions: readingTests.length
    },
    {
      id: "writing",
      title: "Writing", 
      icon: PenTool,
      color: "bg-purple-500 hover:bg-purple-600",
      tests: writingTests,
      duration: "60 min",
      questions: writingTests.length
    },
    {
      id: "speaking",
      title: "Speaking",
      icon: Mic,
      color: "bg-orange-500 hover:bg-orange-600",
      tests: speakingTests, 
      duration: "15 min",
      questions: speakingTests.length
    }
  ];

  const renderTestsList = (tests: any[], testType: string) => {
    return (
      <div className="space-y-3">
        {tests.map((test, index) => (
          <Card key={test.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Part {index + 1}</h4>
                  <p className="text-sm text-gray-600">{test.title}</p>
                  {test.description && (
                    <p className="text-xs text-gray-500 mt-1">{test.description}</p>
                  )}
                </div>
                <Button 
                  size="sm"
                  onClick={() => {
                    // Handle individual test start
                    console.log(`Starting ${testType} test:`, test);
                  }}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Başla
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {selectedTest.title}
          </DialogTitle>
          <p className="text-gray-600">
            Tam test deneyimi için aşağıdaki bölümlerden birini seçin
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Full Test Option */}
          <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-red-100">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-6 w-6 text-red-600" />
                  <span className="text-red-900">Tam Test</span>
                </div>
                <Badge variant="secondary" className="bg-red-600 text-white">
                  165 dakika
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {testSections.map((section) => (
                  <div key={section.id} className="text-center p-3 bg-white rounded-lg">
                    <section.icon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    <div className="text-sm font-medium text-gray-900">{section.title}</div>
                    <div className="text-xs text-gray-500">{section.duration}</div>
                  </div>
                ))}
              </div>
              <Button 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3"
                onClick={() => {
                  // Handle full test start
                  console.log("Starting full test");
                }}
              >
                <Play className="h-5 w-5 mr-2" />
                Tam Testi Başlat
              </Button>
            </CardContent>
          </Card>

          {/* Individual Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testSections.map((section) => {
              const IconComponent = section.icon;
              const isSelected = selectedSection === section.id;
              
              return (
                <Card 
                  key={section.id} 
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
                  }`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedSection(null);
                    } else {
                      setSelectedSection(section.id);
                      onTestTypeClick(section.id, section.tests);
                    }
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${section.color} transition-colors`}>
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <span>{section.title}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {section.duration}
                        </Badge>
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {section.questions}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  
                  {isSelected && (
                    <CardContent>
                      <div className="border-t pt-4">
                        <h4 className="font-medium text-gray-900 mb-3">
                          Mevcut Testler:
                        </h4>
                        {section.tests.length > 0 ? (
                          renderTestsList(section.tests, section.id)
                        ) : (
                          <p className="text-gray-500 text-sm">Bu bölüm için test bulunmuyor.</p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestModal;
