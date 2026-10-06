import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import ReadingQuestionNumber from "@/components/reading-test/ui/ReadingQuestionNumber";
import {
  listeningPracticeSections,
  type ListeningPracticeSection,
} from "./listening-practice-sections";

const letters = ["A", "B", "C"];

function PlaceholderOptions() {
  return (
    <div className="grid min-w-0 max-w-3xl grid-cols-1 gap-0.5" aria-hidden="true">
      {letters.map((letter) => (
        <div
          key={letter}
          className="reading-option-row listening-option-row grid min-h-10 w-full items-start rounded-md px-2.5 py-2 text-[#37352f]"
        >
          <span className="reading-option-radio-slot listening-option-radio-button">
            <span className="reading-option-radio-ring rounded-full border-[1.5px] border-[#a9a7a1]" />
          </span>
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="reading-option-letter shrink-0 font-semibold">{letter}.</span>
            <span className="reading-text reading-option-copy text-[#a9a7a1]">Seçenek metni</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function PlaceholderQuestion({
  number,
  showPrompt = true,
}: {
  number: number;
  showPrompt?: boolean;
}) {
  return (
    <div id={`listening-practice-question-${number}`} className="scroll-mt-4 space-y-2.5">
      <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-2">
        <ReadingQuestionNumber number={number} className={showPrompt ? "" : "pt-2"} />
        <div className="min-w-0">
          {showPrompt ? (
            <p className="reading-question reading-primary-copy reading-text mb-2 text-[#a9a7a1]">
              Soru metni
            </p>
          ) : null}
          <PlaceholderOptions />
        </div>
      </div>
    </div>
  );
}

function PlaceholderSelect({ label }: { label: string }) {
  return (
    <span
      aria-label={label}
      className="inline-flex h-9 min-w-[76px] items-center justify-between gap-2 rounded border border-[#dededb] bg-white px-2.5 text-sm font-medium text-[#5f5e5a]"
    >
      Seç <ChevronDown size={15} aria-hidden="true" />
    </span>
  );
}

function SectionBody({ section, numbers }: { section: ListeningPracticeSection; numbers: number[] }) {
  if (section.number === 1) {
    const half = Math.ceil(numbers.length / 2);
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-4 sm:px-6 lg:py-6">
        <div className="grid grid-cols-1 gap-x-12 lg:grid-cols-2">
          {[numbers.slice(0, half), numbers.slice(half)].map((column, index) => (
            <div key={index} className="min-w-0">
              {column.map((number) => (
                <div key={number} className="border-b border-[#e5e5e2] py-4 last:border-b-0">
                  <PlaceholderQuestion number={number} showPrompt={false} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.number === 2) {
    return (
      <div className="mx-auto w-full max-w-[1080px] px-4 py-4 sm:px-6 lg:py-8">
        <div role="table" aria-label="Bölüm 2 doğru yanlış soruları yerleşimi" className="overflow-x-auto rounded-[4px] border border-[#242424] bg-white">
          <div className="min-w-[620px]">
            <div role="row" className="grid grid-cols-[minmax(0,1fr)_76px_76px] border-b border-[#242424]">
              <span role="columnheader" className="px-5 py-3 text-[14px] font-semibold">Soru</span>
              <span role="columnheader" className="flex items-center justify-center border-l border-[#242424] text-[13px] font-semibold">Doğru</span>
              <span role="columnheader" className="flex items-center justify-center border-l border-[#242424] text-[13px] font-semibold">Yanlış</span>
            </div>
            {numbers.map((number) => (
              <div id={`listening-practice-question-${number}`} key={number} role="row" className="grid min-h-[64px] scroll-mt-4 grid-cols-[minmax(0,1fr)_76px_76px] border-b border-[#242424] last:border-b-0">
                <span role="cell" className="grid grid-cols-[64px_minmax(0,1fr)] items-center px-5 py-3">
                  <ReadingQuestionNumber number={number} />
                  <span className="reading-question reading-primary-copy reading-text text-[#a9a7a1]">Soru metni</span>
                </span>
                {["Doğru", "Yanlış"].map((answer) => (
                  <span key={answer} role="cell" className="flex items-center justify-center border-l border-[#242424]">
                    <span aria-hidden="true" className="h-4 w-4 rounded-full border-[1.5px] border-[#a9a7a1]" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (section.number === 3) {
    return (
      <div className="grid min-h-[420px] grid-cols-1 border-t border-[#e5e5e2] lg:grid-cols-[35%_65%]">
        <div className="min-w-0 px-6 py-4 lg:border-r lg:border-[#deded9]">
          <div className="ml-auto w-full max-w-[394px] lg:pt-6">
            {numbers.map((number, index) => (
              <div id={`listening-practice-question-${number}`} key={number} className="grid min-h-[64px] scroll-mt-4 grid-cols-[52px_minmax(0,1fr)_88px] items-center gap-x-2 border-b border-[#e5e5e2] py-3 last:border-b-0">
                <ReadingQuestionNumber number={number} />
                <span className="reading-question reading-primary-copy reading-text min-w-0 text-[#787774]">Konuşmacı {index + 1}</span>
                <PlaceholderSelect label={`Soru ${number} seçimi`} />
              </div>
            ))}
          </div>
        </div>
        <div className="reading-surface-alt min-w-0 border-t border-[#e5e5e2] px-6 py-5 lg:border-t-0">
          <div className="mx-auto max-w-[600px]">
            <h3 className="reading-options-heading mb-3">Seçenekler</h3>
            {Array.from({ length: 6 }, (_, index) => String.fromCharCode(65 + index)).map((letter) => (
              <div key={letter} className="reading-option-legend grid min-h-10 grid-cols-[minmax(0,1fr)_18px] items-start gap-x-2 rounded-md px-2.5 py-2">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="reading-option-letter shrink-0 font-semibold">{letter}.</span>
                  <span className="reading-text reading-option-copy text-[#a9a7a1]">Seçenek metni</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (section.number === 4) {
    return (
      <div className="grid min-h-[520px] grid-cols-1 border-y border-[#e5e5e2] lg:grid-cols-[52%_48%]">
        <div className="flex min-h-[360px] min-w-0 flex-col lg:border-r lg:border-[#deded9]">
          <h3 className="reading-options-heading border-b border-[#e5e5e2] px-5 py-3">Harita</h3>
          <div className="flex flex-1 items-center justify-center p-5">
            <div className="flex aspect-[4/3] w-full max-w-[760px] items-center justify-center border border-dashed border-[#dededb] bg-[#f7f7f5] text-sm text-[#787774]">
              Harita eklenecek
            </div>
          </div>
        </div>
        <div className="min-w-0 px-6 py-4">
          <h3 className="reading-options-heading mb-2">Sorular</h3>
          {numbers.map((number) => (
            <div id={`listening-practice-question-${number}`} key={number} className="flex scroll-mt-4 items-center gap-3 border-b border-[#e5e5e2] py-4 last:border-b-0">
              <ReadingQuestionNumber number={number} />
              <span className="reading-question reading-primary-copy reading-text min-w-0 flex-1 text-[#a9a7a1]">Yer adı</span>
              <PlaceholderSelect label={`Soru ${number} seçimi`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.number === 5) {
    return (
      <div className="mx-auto w-full max-w-[980px] px-4 py-4 sm:px-6 lg:py-6">
        {[0, 1, 2].map((dialogIndex) => (
          <section key={dialogIndex} className="border-b border-[#deded9] py-6 first:pt-0 last:border-b-0 last:pb-0">
            <div className="mb-2 flex items-center bg-[#f1f1ef] px-3 py-2">
              <h3 className="reading-options-heading">{dialogIndex + 1}. diyalog</h3>
            </div>
            <div className="divide-y divide-[#efefec]">
              {numbers.slice(dialogIndex * 2, dialogIndex * 2 + 2).map((number) => (
                <div key={number} className="py-4"><PlaceholderQuestion number={number} /></div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[980px] px-4 py-4 sm:px-6 lg:py-6">
      {numbers.map((number) => (
        <div key={number} className="border-b border-[#e5e5e2] py-5 last:border-b-0">
          <PlaceholderQuestion number={number} />
        </div>
      ))}
    </div>
  );
}

export default function ListeningPracticeSectionPreview() {
  const navigate = useNavigate();
  const { sectionSlug } = useParams();
  const sectionNumber = /^bolum-([1-6])$/.exec(sectionSlug || "")?.[1];
  const section = listeningPracticeSections.find((item) => item.number === Number(sectionNumber));
  const [showDescription, setShowDescription] = useState(true);

  if (!section) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <p>Bu dinleme bölümü bulunamadı.</p>
        <button type="button" onClick={() => navigate("/app/pratik?bolum=listening")} className="text-sm underline">Pratiklere dön</button>
      </div>
    );
  }

  const questionNumbers = Array.from(
    { length: section.end - section.start + 1 },
    (_, index) => section.start + index,
  );
  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-white font-sans text-[#37352f] reading-exam-page listening-exam-page">
      <header className="w-full shrink-0 border-b border-[#e5e5e2] bg-white">
        <div className="relative grid min-h-[60px] grid-cols-[auto_1fr_auto] items-center gap-3 px-2 py-2 sm:px-4 lg:h-[60px] lg:py-0">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo11.svg" alt="TURKISHMOCK" className="block h-10 w-auto shrink-0 object-contain" />
            <span className="hidden h-5 w-px shrink-0 bg-[#dededb] sm:block" aria-hidden="true" />
            <span className="hidden truncate text-[17px] font-semibold text-[#37352f] sm:inline">Dinleme</span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/app/pratik?bolum=listening")}
            className="group relative col-start-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#777570] transition-colors hover:bg-[#f1f1ee] hover:text-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96] focus-visible:ring-offset-2"
            aria-label="Çalışmadan çık"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            <span className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-50 hidden whitespace-nowrap rounded-full bg-[#111827] px-2.5 py-1 text-[12px] font-medium text-white shadow-sm group-hover:block">
              Çalışmadan çık
            </span>
          </button>
        </div>
      </header>

      <section className="mx-2 mt-2 shrink-0 border-b border-[#e5e5e2] bg-white px-3 py-3.5 sm:mx-4 sm:px-4">
        <div className={`flex items-center justify-between gap-3 ${showDescription ? "mb-1.5" : ""}`}>
          <h1 className="reading-part-heading">Bölüm {section.number}</h1>
          <button
            type="button"
            onClick={() => setShowDescription((value) => !value)}
            aria-expanded={showDescription}
            aria-label={showDescription ? "Anlatımı gizle" : "Anlatımı göster"}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#6f6d67] hover:bg-[#f1f1ef]"
          >
            {showDescription ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        {showDescription ? (
          <p className="reading-part-description max-w-6xl">{section.instruction}</p>
        ) : null}
      </section>

      <p role="status" className="mx-4 mt-3 shrink-0 rounded border border-[#e5e5e2] bg-[#f7f7f5] px-4 py-2 text-[13px] text-[#5f5e5a]">
        Bu bölümün sınav yerleşimi taslağıdır. Ses, soru metinleri ve cevaplar henüz eklenmedi.
      </p>

      <main className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
        <SectionBody section={section} numbers={questionNumbers} />
      </main>

    </div>
  );
}
