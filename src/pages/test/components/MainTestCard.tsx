import { Play } from "lucide-react";
import { Card } from "@/components/ui/card";

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
}: MainTestCardProps) => {
  return (
    <Card 
      className="relative h-80 w-full bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 rounded-2xl cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden group"
      onClick={() => onTestStart(test)}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute top-4 right-4 w-32 h-32 border border-white/20 rounded-full"></div>
        <div className="absolute bottom-4 left-4 w-24 h-24 border border-white/20 rounded-full"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-8 h-full flex flex-col justify-between">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="text-white/80 text-sm font-medium">
            IELTS
          </div>
          <div className="text-white/60 text-xs">
            Academic Test
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-2 tracking-wide">
            {test.title}
          </h2>
          <div className="text-white/80 text-lg font-medium">
            Official Practice Test
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex items-center justify-between">
          <div className="text-white/70 text-sm">
            Full Test • 2h 45min
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 group-hover:bg-white/30 transition-colors">
            <Play className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </Card>
  );
};

export default MainTestCard;
