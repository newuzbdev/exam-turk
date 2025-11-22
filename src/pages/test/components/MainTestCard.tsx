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
      className="relative overflow-hidden rounded-lg border border-gray-200 cursor-pointer hover:shadow-lg transition-all duration-300 h-72"
      onClick={() => onTestStart(test)}
    >
      {/* Background with blurred IELTS document style */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='300' fill='%23f8f9fa'/%3E%3Ctext x='20' y='30' font-family='serif' font-size='14' fill='%23999' opacity='0.3'%3EUNIVERSITY%3C/text%3E%3Ctext x='20' y='50' font-family='serif' font-size='12' fill='%23999' opacity='0.3'%3EESOL Examinations%3C/text%3E%3Ctext x='20' y='70' font-family='serif' font-size='12' fill='%23999' opacity='0.3'%3EEnglish for Speakers of Other Languages%3C/text%3E%3Ctext x='150' y='120' font-family='serif' font-size='24' font-weight='bold' fill='%23999' opacity='0.2'%3EIELTS%3C/text%3E%3Ctext x='20' y='150' font-family='serif' font-size='11' fill='%23999' opacity='0.25'%3EReport Form%3C/text%3E%3Ctext x='20' y='180' font-family='serif' font-size='10' fill='%23999' opacity='0.2'%3Eadmission to undergraduate and postgraduate course%3C/text%3E%3Ctext x='20' y='200' font-family='serif' font-size='10' fill='%23999' opacity='0.2'%3EGENERAL TRAINING Reading and Writing Modules%3C/text%3E%3Ctext x='50' y='250' font-family='serif' font-size='16' font-weight='bold' fill='%23999' opacity='0.15'%3EIELTS%3C/text%3E%3Ctext x='100' y='250' font-family='serif' font-size='16' font-weight='bold' fill='%23999' opacity='0.15'%3EIELTS%3C/text%3E%3Ctext x='200' y='250' font-family='serif' font-size='16' font-weight='bold' fill='%23999' opacity='0.15'%3EIELTS%3C/text%3E%3C/svg%3E")`,
          filter: 'blur(2px)',
          transform: 'scale(1.1)'
        }}
      />
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-red-900/40" />
      
      {/* Content */}
      <div className="relative h-full flex items-center justify-center p-6">
        <h3 className="text-3xl font-bold text-white text-center drop-shadow-lg">
          {test.title}
        </h3>
      </div>
    </Card>
  );
};

export default MainTestCard;
