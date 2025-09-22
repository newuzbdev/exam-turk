import { useState } from "react";

export default function ReadingPart1() {
  const [answers, setAnswers] = useState({
    S1: "",
    S2: "",
    S3: "",
    S4: "",
    S5: "",
    S6: "",
  });

  const handleAnswerChange = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const multipleChoiceOptions = [
    { letter: "A", text: "derin" },
    { letter: "B", text: "doğaüstü" },
    { letter: "C", text: "kademsizlik" },
    { letter: "D", text: "derin" },
    { letter: "E", text: "doğaüstü" },
    { letter: "F", text: "kademsizlik" },
    { letter: "G", text: "derin" },
    { letter: "H", text: "doğaüstü" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="w-full mx-auto bg-white border-gray-800 rounded-lg overflow-hidden">
        <div className="flex">
          <div className="flex-1 p-6 border-r-2 border-dashed border-gray-400">
            <h2 className="text-xl font-bold mb-4">1. OKUMA METNİ</h2>
            <p className="mb-4 text-sm leading-relaxed">
              Sorular 1-6. Aşağıdaki metni okuyunuz ve alttaki sözcükleri (A-H)
              kullanarak boşlukları (1-6) doldurunuz. Her sözcük yalnızca bir
              defa kullanılabilir. Seçmemeniz gereken İKİ seçenek bulunmaktadır.
            </p>

            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-center">Takvimler</h3>
              <div className="text-sm leading-relaxed space-y-4">
                <p>
                  Batıl inançlar, bilimsel bir temele dayanmayan, ancak birçok
                  insanın günlük yaşamında etkili olan inanışlardır. Tarih
                  boyunca insanlar, doğa olaylarını ve açıklayamadıkları
                  durumları __________ (S1) güçlerle ilişkilendirmişlerdir. Bu
                  inançlar, nesilden nesle aktarılmış ve bazıları günümüzde bile
                  varlığını sürdürmektedir.
                </p>
                <p>
                  En yaygın batıl inançlardan biri, kara kedinin önünden
                  geçmesinin __________ (S2) getireceğine inanılmasıdır. Bunun
                  kökeni Orta Çağ'a dayanır; o dönemde kara kedilerin cadılarla
                  ilişkilendirildiği düşünülürdü.
                </p>
                <p>
                  Batıl inançlar sadece kötü şansla ilgili değildir; bazıları
                  iyi şans getirdiğine inanılan ritüelleri de içerir. Örneğin,
                  nazar boncuğu takmak, kişiyi kötü enerjilerden koruduğuna
                  inanılan yaygın bir gelenektir. Nazar inancı, eski Türk
                  kültürüne dayansa da, günümüzde Türkiye'nin __________ (S3)
                  birçok farklı kültürde de yaygındır.
                </p>
                <p>
                  Batıl inançların insanlar üzerindeki etkisi oldukça __________
                  (S4). Özellikle önemli kararlar alınırken ya da yeni bir işe
                  başlanırken bu inançlar dikkate alınabilir.
                </p>
                <p>
                  Örneğin, yeni bir eve taşınmadan önce eve tuz dökmenin kötü
                  ruhları uzaklaştıracağına inanılır. Benzer şekilde, merdiven
                  altından geçmenin kötü şans getirdiğine dair inanış da hâlâ
                  birçok insan tarafından dikkate alınmaktadır.
                </p>
                <p>
                  Günümüzde bilimin ilerlemesiyle batıl inançların __________
                  (S5) alanı azalmış olsa da, bu __________ (S6) inançlar
                  kültürel mirasın bir parçası olarak yaşamaya devam etmektedir.
                </p>
              </div>
            </div>
          </div>

          {/* Javoblar qismi */}
          <div className="w-80 p-6">
            <div className="space-y-4 mb-8">
              {Object.entries(answers).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="font-bold text-lg">{key}.</span>
                  <select
                    value={value}
                    onChange={(e) => handleAnswerChange(key, e.target.value)}
                    className="flex-1 border-2 border-gray-800 rounded-md px-2 py-1"
                  >
                    <option value="">Tanlang</option>
                    {multipleChoiceOptions.map((option) => (
                      <option key={option.letter} value={option.text}>
                        {option.letter}) {option.text}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Variantlar */}
            <div className="space-y-3">
              {multipleChoiceOptions.map((option) => (
                <div key={option.letter} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-gray-800 flex items-center justify-center font-bold">
                    {option.letter}
                  </div>
                  <span className="text-sm">{option.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
