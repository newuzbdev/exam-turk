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
      className="group relative overflow-hidden rounded-xl border border-gray-800/40 bg-neutral-900 hover:bg-neutral-900/90 transition-colors cursor-pointer"
      onClick={() => onTestStart(test)}
    >
      <div className="relative h-56 sm:h-64">
        <img
          src="/turk-test.png"
          alt="IELTS Test"
          className="absolute inset-0 h-full w-full object-cover opacity-70 group-hover:opacity-80 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-3xl font-extrabold tracking-wide drop-shadow-md">
            {test.title}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default MainTestCard;
