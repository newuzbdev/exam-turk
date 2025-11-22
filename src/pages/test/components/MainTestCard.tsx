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
      className="relative overflow-hidden rounded-xl border-2 border-gray-200 cursor-pointer hover:border-red-500 hover:shadow-2xl transition-all duration-300 h-72 bg-white group"
      onClick={() => onTestStart(test)}
    >
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-300"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)`
        }}
      />
      
      {/* Content */}
      <div className="relative h-full flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          {/* Decorative line above text */}
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <h3 className="text-3xl font-bold text-gray-900 text-center group-hover:text-red-600 transition-colors duration-300">
            {test.title}
          </h3>
          
          {/* Decorative line below text */}
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>
      
      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-red-600 to-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </Card>
  );
};

export default MainTestCard;
