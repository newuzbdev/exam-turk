import {
  BookOpen,
  Headphones,
  Mic,
  PenTool,
  Play,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

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
}: TestModalProps) => {
  const navigate = useNavigate();

  const testSections = [
    {
      id: "listening",
      title: "Listening",
      icon: Headphones,
      tests: listeningTests,
      duration: "30 min",
      gradient: "from-blue-500 to-blue-600",
      description: "4 sections, 40 questions"
    },
    {
      id: "reading",
      title: "Reading", 
      icon: BookOpen,
      tests: readingTests,
      duration: "60 min",
      gradient: "from-green-500 to-green-600",
      description: "3 passages, 40 questions"
    },
    {
      id: "writing",
      title: "Writing",
      icon: PenTool,
      tests: writingTests,
      duration: "60 min",
      gradient: "from-orange-500 to-orange-600",
      description: "2 tasks"
    },
    {
      id: "speaking",
      title: "Speaking",
      icon: Mic,
      tests: speakingTests,
      duration: "15 min",
      gradient: "from-red-500 to-red-600",
      description: "3 parts, face-to-face"
    },
  ];

  const handleSectionClick = (section: any) => {
    if (section.tests.length === 0) return;
    
    const testId = section.tests[0].id;
    if (section.id === "speaking") {
      navigate(`/speaking-test/${testId}`);
    } else if (section.id === "writing") {
      navigate(`/writing-test/${testId}`);
    } else if (section.id === "listening") {
      navigate(`/listening-test/${testId}`);
    } else if (section.id === "reading") {
      navigate(`/reading-test/${testId}`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] bg-white rounded-2xl border-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-purple-700 p-8">
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold mb-2">{selectedTest.title}</h2>
            <p className="text-purple-100">Choose a section to begin your practice</p>
          </div>
        </div>

        {/* Test Sections Grid */}
        <div className="p-8">
          <div className="grid grid-cols-2 gap-6">
            {testSections.map((section) => {
              const IconComponent = section.icon;
              const hasTests = section.tests.length > 0;
              
              return (
                <div
                  key={section.id}
                  className={`relative overflow-hidden rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-105 ${
                    hasTests ? 'hover:shadow-lg' : 'opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => hasTests && handleSectionClick(section)}
                >
                  <div className={`bg-gradient-to-br ${section.gradient} p-6 text-white h-full`}>
                    <div className="flex items-start justify-between mb-4">
                      <IconComponent className="h-8 w-8" />
                      <div className="text-right">
                        <div className="text-sm opacity-90">{section.duration}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold mb-2">{section.title}</h3>
                      <p className="text-sm opacity-90 mb-4">{section.description}</p>
                      
                      {hasTests ? (
                        <div className="flex items-center text-sm">
                          <Play className="h-4 w-4 mr-2" />
                          Start Test
                        </div>
                      ) : (
                        <div className="text-sm opacity-70">
                          No tests available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Test Option */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div 
              className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
              onClick={() => {
                // Handle full test start - for now just close modal
                console.log("Starting full test");
                onOpenChange(false);
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Complete IELTS Test</h3>
                  <p className="text-gray-300">All four sections • 2 hours 45 minutes</p>
                </div>
                <div className="flex items-center">
                  <Play className="h-6 w-6 mr-2" />
                  <span>Start Full Test</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestModal;
