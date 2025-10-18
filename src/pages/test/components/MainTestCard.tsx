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
      className="relative overflow-hidden rounded-lg border border-gray-200 bg-white cursor-pointer"
      onClick={() => onTestStart(test)}
    >
      <div className="relative h-52">
        {/* Simple Background with Education Theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-red-50"></div>
        
        {/* Subtle Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        
        {/* Content */}
        <div className="relative h-full flex flex-col p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div className="text-right">
              <div className="w-2 h-2 bg-green-500 rounded-full mb-1"></div>
              <div className="text-xs text-gray-500">Mevcut</div>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {test.title}
            </h3>
            <p className="text-base text-gray-600 mb-4">Türkçe Deneme Sınavı</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>📚 Türkçe</span>
              <span>⏱️ 2-3 saat</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MainTestCard;
