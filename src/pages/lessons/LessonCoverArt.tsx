import { Clock3, Headphones, MessageCircle, NotebookPen } from 'lucide-react';
import type { LessonCover } from './lesson-catalog';

// Code-native line icons keep the approved covers sharp at every size.
export function LessonCoverArt({ kind }: { kind: LessonCover }) {
  return <div className={`lesson-cover-art lesson-cover-${kind}`} aria-hidden="true">
    {kind === 'headphones' ? <><Headphones className="cover-main-icon" strokeWidth={0.8} /><div className="cover-wave">{[12, 24, 35, 50, 30, 44, 18].map((height, index) => <i key={index} style={{ height }} />)}</div></> : null}
    {kind === 'notes' ? <NotebookPen className="cover-main-icon" strokeWidth={0.8} /> : null}
    {kind === 'conversation' ? <><MessageCircle className="cover-main-icon" strokeWidth={0.8} /><MessageCircle className="cover-second-icon" strokeWidth={0.8} /></> : null}
    {kind === 'clock' ? <Clock3 className="cover-main-icon" strokeWidth={0.8} /> : null}
    {kind === 'choices' ? <div className="cover-choices"><span>A</span><span>B</span></div> : null}
    {kind === 'gaps' ? <div className="cover-gaps"><span /><span /><span /><span /></div> : null}
    <div className="cover-rule" /><div className="cover-rule cover-rule-short" />
  </div>;
}
