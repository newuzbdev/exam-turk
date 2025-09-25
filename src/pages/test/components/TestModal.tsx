import { BookOpen, CheckCircle2, Coins, Headphones, Mic, PenTool } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  const { isAuthenticated } = useAuth();

  // selection state for simple checklist UI
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({
    listening: true,
    reading: true,
    writing: true,
    speaking: false,
  });

  const toggle = (key: string) =>
    setSelectedMap((p) => ({ ...p, [key]: !p[key] }));
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  console.log("TestModal - Selected test:", selectedTest);
  console.log("TestModal - Writing tests received:", writingTests);

  const testSections = [
    {
      id: "listening",
      title: "LISTENING",
      icon: Headphones,
      tests: listeningTests,
      cost: 3,
    },
    {
      id: "reading",
      title: "READING",
      icon: BookOpen,
      tests: readingTests,
      cost: 3,
    },
    {
      id: "writing",
      title: "WRITING",
      icon: PenTool,
      tests: writingTests,
      cost: 4,
    },
    {
      id: "speaking",
      title: "SPEAKING",
      icon: Mic,
      tests: speakingTests,
      cost: 2,
    },
  ];

  const totalCoins = testSections.reduce((acc, s) => {
    const available = s.tests && s.tests.length > 0;
    return acc + (available && selectedMap[s.id] ? s.cost : 0);
  }, 0);

  const handleCta = () => {
    // Choose first selected and available section for navigation
    const chosen = testSections.find(
      (s) => selectedMap[s.id] && s.tests && s.tests.length > 0
    );
    if (!chosen || !chosen.tests[0]) return;
    const test = chosen.tests[0];
    const path =
      chosen.id === "speaking"
        ? `/speaking-test/${test.id}`
        : chosen.id === "writing"
        ? `/writing-test/${test.id}`
        : chosen.id === "listening"
        ? `/listening-test/${test.id}`
        : `/reading-test/${test.id}`;

    if (!isAuthenticated) {
      navigate("/signup", { state: { redirectTo: path } });
      return;
    }
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[95vw] bg-[#0b0f13] text-white rounded-xl border border-white/10">
        <div className="p-4 sm:p-6">
          <h3 className="text-xl font-semibold mb-2">{selectedTest.title}</h3>
          <p className="text-white/70 text-sm mb-6">
            Choose the test types you want to take.
          </p>

          <div className="space-y-3">
            {testSections.map((s) => {
              const Icon = s.icon;
              const available = s.tests && s.tests.length > 0;
              const selected = !!selectedMap[s.id];
              return (
                <Card
                  key={s.id}
                  className={`bg-transparent border ${
                    selected ? "border-purple-700" : "border-white/10"
                  } ${available ? "" : "opacity-50"}`}
                >
                  <button
                    className="w-full flex items-center justify-between px-4 py-3"
                    onClick={() => available && toggle(s.id)}
                    disabled={!available}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-5 w-5 rounded-md flex items-center justify-center ${
                          selected ? "bg-purple-700" : "bg-white/10"
                        }`}
                      >
                        {selected && <CheckCircle2 className="h-4 w-4" />}
                      </span>
                      <Icon className="h-4 w-4 text-white/80" />
                      <span className="font-medium tracking-wide">{s.title}</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-300">
                      <Coins className="h-4 w-4" />
                      <span className="text-sm">{s.cost}</span>
                    </div>
                  </button>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-6 mb-4">
            <span className="text-white/80">Total</span>
            <div className="flex items-center gap-1 text-amber-300">
              <Coins className="h-4 w-4" />
              <span className="font-semibold">{totalCoins}</span>
            </div>
          </div>

          <Button
            className="w-full h-11 bg-purple-700 hover:bg-purple-800"
            onClick={handleCta}
          >
            {isAuthenticated ? "Start" : "Sign Up"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestModal;
