import {
  BookOpen,
  Clock,
  Headphones,
  Mic,
  PenTool,
  Play,
  Target,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

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
  onTestTypeClick,
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
      questions: listeningTests.length,
    },
    {
      id: "reading",
      title: "Reading",
      icon: BookOpen,
      color: "bg-gray-600 hover:bg-gray-700",
      tests: readingTests,
      duration: "60 min",
      questions: readingTests.length,
    },
    {
      id: "writing",
      title: "Writing",
      icon: PenTool,
      color: "bg-gray-600 hover:bg-gray-700",
      tests: writingTests,
      duration: "60 min",
      questions: writingTests.length,
    },
    {
      id: "speaking",
      title: "Speaking",
      icon: Mic,
      color: "bg-gray-600 hover:bg-gray-700",
      tests: speakingTests,
      duration: "15 min",
      questions: speakingTests.length,
    },
  ];

  const renderTestsList = (tests: any[], testType: string) => {
    return (
      <div className="space-y-2">
        {tests.map((test, index) => (
          <div
            key={test.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50"
          >
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Part {index + 1}
              </div>
              <div className="text-sm text-gray-700">{test.title}</div>
              {test.description && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {test.description}
                </div>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (testType === "speaking") {
                  navigate(`/speaking-test/${test.id}`);
                } else if (testType === "writing") {
                  navigate(`/writing-test/${test.id}`);
                } else if (testType === "listening") {
                  navigate(`/listening-test/${test.id}`);
                } else if (testType === "reading") {
                  navigate(`/reading-test/${test.id}`);
                } else {
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
      <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-y-auto bg-white">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {selectedTest.title}
          </DialogTitle>
          <p className="text-gray-600 mt-2">Choose which test section you want to practice</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Full Test Option */}
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 hover:border-purple-300 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500 rounded-full">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Complete IELTS Test</h3>
                    <p className="text-sm text-gray-600">All four skills in one session</p>
                  </div>
                </div>
                <Badge className="bg-purple-500 text-white text-sm px-3 py-1">
                  3 hours
                </Badge>
              </div>
              
              <div className="grid grid-cols-4 gap-3 mb-4">
                {testSections.map((section) => (
                  <div
                    key={section.id}
                    className="text-center p-3 bg-white rounded-lg border border-purple-200"
                  >
                    <section.icon className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                    <div className="text-xs font-medium text-gray-900">
                      {section.title}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {section.duration}
                    </div>
                  </div>
                ))}
              </div>
              
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 text-base"
                onClick={() => {
                  console.log("Starting full test");
                  onOpenChange(false);
                }}
              >
                <Play className="h-5 w-5 mr-2" />
                Start Complete Test
              </Button>
            </CardContent>
          </Card>

          {/* Individual Sections */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Or practice individual sections:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testSections.map((section) => {
                const IconComponent = section.icon;
                const isSelected = selectedSection === section.id;
                const hasTests = section.tests.length > 0;

                return (
                  <Card
                    key={section.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      hasTests 
                        ? "hover:shadow-lg border-gray-200 hover:border-gray-300" 
                        : "opacity-50 cursor-not-allowed bg-gray-50"
                    } ${
                      isSelected ? "ring-2 ring-blue-500 shadow-lg" : ""
                    }`}
                    onClick={() => {
                      if (!hasTests) return;
                      if (isSelected) {
                        setSelectedSection(null);
                      } else {
                        setSelectedSection(section.id);
                        onTestTypeClick(section.id, section.tests);
                      }
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${hasTests ? 'bg-blue-100' : 'bg-gray-200'}`}>
                            <IconComponent className={`h-5 w-5 ${hasTests ? 'text-blue-600' : 'text-gray-400'}`} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{section.title}</h4>
                            <p className="text-sm text-gray-500">{section.duration}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={hasTests ? "" : "opacity-50"}>
                          {section.questions} {section.questions === 1 ? 'test' : 'tests'}
                        </Badge>
                      </div>

                      {isSelected && hasTests && (
                        <div className="border-t pt-4 mt-4">
                          <div className="space-y-3">
                            {section.tests.map((test, index) => (
                              <div
                                key={test.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                              >
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">
                                    Part {index + 1}
                                  </div>
                                  <div className="text-sm text-gray-600">{test.title}</div>
                                  {test.description && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {test.description}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (section.id === "speaking") {
                                      navigate(`/speaking-test/${test.id}`);
                                    } else if (section.id === "writing") {
                                      navigate(`/writing-test/${test.id}`);
                                    } else if (section.id === "listening") {
                                      navigate(`/listening-test/${test.id}`);
                                    } else if (section.id === "reading") {
                                      navigate(`/reading-test/${test.id}`);
                                    }
                                    onOpenChange(false);
                                  }}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Start
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!hasTests && (
                        <p className="text-center text-gray-400 text-sm mt-2">
                          No tests available for this section
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestModal;
