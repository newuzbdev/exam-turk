import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Lightbulb, Loader2, Send } from "lucide-react";
import writingPracticeService from "@/services/writingPractice.service";
import { writingHelpErrorMessage } from "./writing-practice-help";
import type { WritingHelpReply, WritingPracticeHelpContent } from "./writing-practice-help";

const choices = [
  { id: "plan", label: "Plan" },
  { id: "opening", label: "Başlangıç" },
  { id: "words", label: "Kelimeler" },
  { id: "ask", label: "Sor / İpucu" },
] as const;

function HelpWord({ word, meaning }: { word: string; meaning: string }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const show = () => {
    const rect = button.current?.getBoundingClientRect();
    if (rect) setPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.min(280, window.innerWidth - 16) - 8)),
      top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 100)),
    });
  };
  return <>
    <button ref={button} type="button" aria-describedby={position ? id : undefined}
      onPointerEnter={event => { if (event.pointerType !== "touch") show(); }}
      onPointerLeave={() => setPosition(null)} onFocus={show} onBlur={() => setPosition(null)}
      onClick={show} onKeyDown={event => { if (event.key === "Escape") setPosition(null); }}
      className="rounded-md border border-[#dededb] bg-white px-2.5 py-1.5 text-[13px] hover:bg-[#f1f1ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#777570]">
      {word}
    </button>
    {position ? createPortal(<div id={id} role="tooltip"
      className="fixed z-[100] w-[280px] max-w-[calc(100vw-16px)] rounded-md border border-[#d5d5d2] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#37352f] shadow-md"
      style={position}>{meaning}</div>, document.body) : null}
  </>;
}

export default function WritingPracticeHelp({ practiceId, answerText, disabled = false }: {
  practiceId: string; answerText: string; disabled?: boolean;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<(typeof choices)[number]["id"]>("plan");
  const [help, setHelp] = useState<WritingPracticeHelpContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [questionId, setQuestionId] = useState("concept_1");
  const [reply, setReply] = useState<WritingHelpReply | null>(null);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);

  const loadHelp = async () => {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setLoading(true); setError("");
    try {
      const content = await writingPracticeService.getHelp(practiceId, request.signal);
      if (mounted.current) setHelp(content);
    } catch (cause) {
      if (mounted.current && !request.signal.aborted)
        setError(writingHelpErrorMessage(cause, "Yardım yüklenemedi. Tekrar deneyin."));
    } finally {
      if (controller.current === request) controller.current = null;
      if (mounted.current) setLoading(false);
    }
  };

  const ask = async () => {
    if (!help || help.remaining <= 0 || disabled || controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setAsking(true); setError("");
    try {
      const result = await writingPracticeService.askHelp(practiceId, questionId, answerText, request.signal);
      if (!mounted.current) return;
      setReply(result);
      setHelp(current => current ? { ...current, used: result.used, remaining: result.remaining,
        history: [...current.history.filter(item => item.id !== result.id), result],
      } : current);
    } catch (cause) {
      if (!mounted.current || request.signal.aborted) return;
      setError(writingHelpErrorMessage(cause, "Yanıt alınamadı. Biraz sonra tekrar deneyin."));
      // Recover a saved reply/allowance after a transport timeout without another AI call.
      try {
        const content = await writingPracticeService.getHelp(practiceId, request.signal);
        if (mounted.current) setHelp(content);
      } catch { /* Keep the visible error; the draft stays usable. */ }
    } finally {
      if (controller.current === request) controller.current = null;
      if (mounted.current) setAsking(false);
    }
  };
  const labelFor = (id: string) => help?.questions.find(item => item.id === id)?.label || "Önceki soru";
  const previous = help?.history.filter(item => item.id !== reply?.id) || [];

  return (
    <section aria-label="Yazma yardımı"
      className="flex max-h-[65%] min-h-0 shrink-0 flex-col overflow-hidden rounded-md border border-[#dededb] bg-white text-[13px] leading-relaxed text-[#37352f] sm:max-h-[55%]">
      <button type="button" aria-expanded={open} aria-controls={panelId}
        onClick={() => { setOpen(value => !value); if (!open && !help) void loadHelp(); }}
        className="flex min-h-9 w-full shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-left font-medium transition-colors hover:bg-[#f1f1ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#777570]">
        <Lightbulb
          className={`h-4 w-4 transition-[color,fill,filter] duration-200 motion-reduce:transition-none ${open ? "fill-[#fde047] text-[#c89400] drop-shadow-[0_0_4px_rgba(250,204,21,0.6)]" : "fill-none text-current"}`}
          strokeWidth={1.75} aria-hidden="true" /> Yardım
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? <div id={panelId} className="flex min-h-0 flex-1 flex-col border-t border-[#e5e5e2]">
        {help ? <div role="group" aria-label="Yardım seçenekleri" className="flex shrink-0 flex-wrap gap-1 px-3 pt-2">
          {choices.map(item => <button key={item.id} type="button" aria-pressed={choice === item.id}
            onClick={() => setChoice(item.id)}
            className={`min-h-8 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#777570] ${choice === item.id ? "bg-[#eeeeeb] text-[#242424]" : "text-[#6f6d67] hover:bg-[#f1f1ee] hover:text-[#242424]"}`}>
            {item.label}
          </button>)}
        </div> : null}
        <div className="min-h-0 overflow-y-auto px-3 pb-3 pt-2" tabIndex={0} role="region"
          aria-label={choices.find(item => item.id === choice)?.label}>
          {loading ? <p role="status" className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Yardım yükleniyor…</p> : null}
          {!help && error ? <div><p role="alert">{error}</p><button type="button" onClick={() => void loadHelp()} className="mt-2 underline underline-offset-4">Tekrar dene</button></div> : null}
          {help ? choice === "plan" ? <ol className="space-y-2">
            {help.plan.map(step => <li key={step.label}><span className="font-medium">{step.label}</span><p className="text-[#6f6d67]">{step.text}</p></li>)}
          </ol> : choice === "opening" ? <div className="space-y-2">
            <p className="text-[12px] text-[#777570]">Örnek başlangıç</p>
            <p className="whitespace-pre-line border-l-2 border-[#37352f] pl-3">{help.opening}</p>
            <p className="text-[12px] text-[#777570]">Bu örnekten yararlanarak kendi cümlenizi cevap alanına yazın.</p>
          </div> : choice === "words" ? <div>
            <p className="mb-2 text-[12px] text-[#777570]">Anlamı görmek için kelimenin üzerine gelin veya dokunun.</p>
            <div className="flex flex-wrap gap-2">{help.words.map(word => <HelpWord key={word.word} {...word} />)}</div>
          </div> : <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-[12px] text-[#777570]">
              <span>Hazır bir soru seçin.</span><span className="tabular-nums" aria-label="Yardım hakkı">{help.remaining} / {help.limit} hak</span>
            </div>
            <div className="flex items-center gap-2">
              <select aria-label="Hazır soru" value={questionId} disabled={asking || disabled}
                onChange={event => { setQuestionId(event.target.value); setError(""); }}
                className="min-h-9 min-w-0 flex-1 rounded-md border border-[#d5d5d2] bg-white px-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#777570]">
                {help.questions.map(question => <option key={question.id} value={question.id}>{question.label}</option>)}
              </select>
              <button type="button" onClick={() => void ask()} disabled={asking || disabled || help.remaining <= 0}
                className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-[#b8b8b3] px-2.5 font-medium hover:bg-[#f1f1ee] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#777570]">
                {asking ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
                {asking ? "Bekleyin" : "Sor"}
              </button>
            </div>
            {error ? <p role="alert" className="text-[12px] text-[#6f6d67]">{error}</p> : null}
            {reply ? <div className="border-l-2 border-[#37352f] pl-3" aria-live="polite">
              <p className="mb-1 text-[12px] text-[#777570]">{labelFor(reply.questionId)}</p><p>{reply.reply}</p>
            </div> : null}
            {help.remaining <= 0 ? <p className="text-[12px] text-[#777570]">Bu pratikteki 10 yardım hakkınız tamamlandı. Plan, başlangıç örneği, kelimeler ve önceki yanıtlar açık kalır.</p>
              : <p className="text-[12px] text-[#777570]">Yanıt, sorunuza ve mevcut metninize göre hazırlanır. Her pratikte en fazla 10 istek.</p>}
            {previous.length ? <details className="border-t border-[#e5e5e2] pt-2">
              <summary className="cursor-pointer text-[12px] text-[#6f6d67]">Önceki yanıtlar ({previous.length})</summary>
              <div className="mt-2 space-y-3">{previous.slice().reverse().map(item => <div key={item.id}>
                <p className="mb-1 text-[12px] text-[#777570]">{labelFor(item.questionId)}</p><p>{item.reply}</p>
              </div>)}</div>
            </details> : null}
          </div> : null}
        </div>
      </div> : null}
    </section>
  );
}
