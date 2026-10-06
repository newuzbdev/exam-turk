import { useEffect, useState } from 'react';
import { isSafeMediaUrl } from './document-utils';
import { projectWorkbookStyle } from './block-style';
import RichWorkbookText from './RichWorkbookText';
import WorkbookExercise, { type ExerciseSubmitResult } from './WorkbookExercise';
import type { StudentExerciseSubmission, WorkbookBlock as WorkbookBlockType } from './types';

export default function WorkbookBlock({ block, exerciseNumber, answerMode, onSubmit, compactTips = false }: {
  block: WorkbookBlockType;
  exerciseNumber?: number;
  answerMode: 'preview' | 'student';
  compactTips?: boolean;
  onSubmit?: (submission: StudentExerciseSubmission) => Promise<ExerciseSubmitResult>;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const style = projectWorkbookStyle(block.style);
  const imageUrl = block.kind === 'image' ? block.url : '';
  const hasCustomFontSize = Boolean(block.style?.fontSize);
  useEffect(() => { setImageFailed(false); }, [imageUrl]);
  if (block.kind === 'heading') {
    return <section className="workbook-block workbook-heading" data-tone={block.tone} data-custom-font-size={hasCustomFontSize} style={style}>{block.level === 2 ? <h2>{block.text}</h2> : <h3>{block.text}</h3>}</section>;
  }
  if (block.kind === 'text') return <section className="workbook-block workbook-text" data-tone={block.tone} data-custom-font-size={hasCustomFontSize} style={style}><RichWorkbookText value={block.text} /></section>;
  if (block.kind === 'quote') return <blockquote lang="tr" className="workbook-block" data-tone={block.tone} data-custom-font-size={hasCustomFontSize} style={style}><RichWorkbookText value={block.text} /></blockquote>;
  if (block.kind === 'tip' && compactTips) return <details className="workbook-block workbook-tip guided-tip"><summary>{block.title}</summary><RichWorkbookText value={block.text} /></details>;
  if (block.kind === 'tip') return <aside className="workbook-block workbook-tip" data-tone={block.tone} data-custom-font-size={hasCustomFontSize} style={style} aria-label={block.title || 'İpucu'}><strong>{block.title}</strong><RichWorkbookText value={block.text} /></aside>;
  if (block.kind === 'image') return <figure className="workbook-block workbook-figure" data-tone={block.tone} data-custom-font-size={hasCustomFontSize} style={style}>
    {isSafeMediaUrl(block.url) && !imageFailed ? <img src={block.url} alt={block.alt} loading="lazy" decoding="async" onError={() => setImageFailed(true)} /> : <div className="workbook-image-error" role="img" aria-label={block.alt || 'Görsel yüklenemedi'}>Görsel yüklenemedi{block.alt ? `: ${block.alt}` : '.'}</div>}
    {block.caption ? <figcaption>{block.caption}</figcaption> : null}
  </figure>;
  if (block.kind === 'table') return <section className="workbook-block workbook-table-block" data-tone={block.tone} data-custom-font-size={hasCustomFontSize} style={style}><div className="workbook-table-scroll" tabIndex={0} role="region" aria-label="Ders tablosu"><table className="workbook-table"><thead><tr>{block.headers.map((header, index) => <th key={index} scope="col"><RichWorkbookText value={header} /></th>)}</tr></thead><tbody>{block.rows.map(row => <tr key={row.id} data-tone={row.tone}>{block.headers.map((_, index) => index === 0 ? <th key={index} scope="row"><RichWorkbookText value={row.cells[index] ?? ''} /></th> : <td key={index}><RichWorkbookText value={row.cells[index] ?? ''} /></td>)}</tr>)}</tbody></table></div></section>;
  return <WorkbookExercise block={block as Extract<WorkbookBlockType, { kind: 'blank' | 'choice' | 'reflection' }>} number={exerciseNumber ?? 1} answerMode={answerMode} onSubmit={onSubmit} style={style} />;
}
