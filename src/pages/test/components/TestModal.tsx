import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  console.log("TestModal - Selected test:", selectedTest);
  console.log("TestModal - Writing tests received:", writingTests);

  const testSections = [
    {
      id: "listening",
      title: "Listening",
      icon: Headphones,
      color: "bg-gray-600 hover:bg-gray-700",
      tests: listeningTests,
      duration: "30 min",
      questions: listeningTests.length
    },
    {
      id: "reading",
      title: "Reading",
      icon: BookOpen,
      color: "bg-gray-600 hover:bg-gray-700",
      tests: readingTests,
      duration: "60 min",
      questions: readingTests.length
    },
    {
      id: "writing",
      title: "Writing",
      icon: PenTool,
      color: "bg-gray-600 hover:bg-gray-700",
      tests: writingTests,
      duration: "60 min",
      questions: writingTests.length
    },
    {
      id: "speaking",
      title: "Speaking",
      icon: Mic,
      color: "bg-gray-600 hover:bg-gray-700",
      tests: speakingTests,
      duration: "15 min",
      questions: speakingTests.length
    }
  ];

  const renderTestsList = (tests: any[], testType: string) => {
    return (
      <div className="space-y-2">
        {tests.map((test, index) => (
          <div key={test.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50">
            <div>
              <div className="text-sm font-semibold text-gray-900">Part {index + 1}</div>
              <div className="text-sm text-gray-700">{test.title}</div>
              {test.description && (
                <div className="text-xs text-gray-500 mt-0.5">{test.description}</div>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (testType === 'speaking') {
                  navigate(`/speaking-test/${test.id}`);
                } else if (testType === 'writing') {
                  navigate(`/writing-test/${test.id}`);
                } else if (testType === 'listening') {
                  navigate(`/listening-test/${test.id}`);
                }
                else {
                  console.log(`Starting ${testType} test:`, test);
                }
              }}
            >
              <Play className="h-4 w-4 mr-1" />
              Başla
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[80vh] overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            {selectedTest.title}
          </DialogTitle>
          <p className="text-gray-600 text-xs">Bölüm seçin ve başlayın.</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Full Test Option */}
          <Card className="border border-gray-200 bg-gray-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-6 w-6 text-gray-700" />
                  <span className="text-gray-900">Tam Test</span>
                </div>
                <Badge variant="secondary" className="bg-gray-700 text-white">
                  165 dakika
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {testSections.map((section) => (
                  <div key={section.id} className="text-center p-2 bg-white rounded-md border border-gray-200">
                    <section.icon className="h-6 w-6 mx-auto mb-1 text-gray-600" />
                    <div className="text-xs font-medium text-gray-900">{section.title}</div>
                    <div className="text-[10px] text-gray-500">{section.duration}</div>
                  </div>
                ))}
              </div>
              <Button
                className="w-full bg-gray-700 hover:bg-gray-800 text-white font-medium py-2"
                onClick={() => {
                  // Handle full test start
                  console.log("Starting full test");
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                Tam Testi Başlat
              </Button>
            </CardContent>
          </Card>

          {/* Individual Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testSections.map((section) => {
              const IconComponent = section.icon;
              const isSelected = selectedSection === section.id;

              return (
                <Card
                  key={section.id}
                  className={`cursor-pointer transition-all border border-gray-200 hover:border-gray-300 ${isSelected ? 'ring-2 ring-blue-500' : ''
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
                        <div className="p-1.5 rounded-md bg-gray-100">
                          <IconComponent className="h-4 w-4 text-gray-700" />
                        </div>
                        <span className="text-gray-900 font-medium text-sm">{section.title}</span>
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
                        <h4 className="font-medium text-gray-900 mb-2 text-sm">
                          Mevcut Testler:
                        </h4>
                        {section.tests.length > 0 ? (
                          renderTestsList(section.tests, section.id)
                        ) : (
                          <p className="text-gray-500 text-xs">Bu bölüm için test bulunmuyor.</p>
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
