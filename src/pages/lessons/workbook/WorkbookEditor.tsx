import { Fragment, useState } from 'react';
import BlockContextToolbar from './BlockContextToolbar';
import BlockInsertMenu from './BlockInsertMenu';
import SelectedBlockFields from './SelectedBlockFields';
import WorkbookBlockView from './WorkbookBlock';
import { createWorkbookBlock, duplicateWorkbookBlock, insertWorkbookBlock, moveBlock, replaceBlock, workbookBlockLabel } from './document-utils';
import type { WorkbookBlock, WorkbookDocument } from './types';

export type PendingImageInsert = { block: Extract<WorkbookBlock, { kind: 'image' }>; index: number };

export default function WorkbookEditor({ document, onChange, onRequestMedia }: { document: WorkbookDocument; onChange: (blocks: WorkbookBlock[]) => void; onRequestMedia: (blockId: string, pendingInsert?: PendingImageInsert) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const update = (block: WorkbookBlock) => onChange(replaceBlock(document.blocks, block));
  const insert = (index: number, kind: WorkbookBlock['kind']) => {
    if (kind === 'image') {
      const block = createWorkbookBlock(kind, document.blocks) as Extract<WorkbookBlock, { kind: 'image' }>;
      setSelectedId(block.id); setFocusId(block.id); onRequestMedia(block.id, { block, index });
      return;
    }
    const result = insertWorkbookBlock(document.blocks, index, kind);
    onChange(result.blocks); setSelectedId(result.blockId); setFocusId(result.blockId);
  };
  let exerciseNumber = 0;
  return <div className="workbook-editor lesson-workbook workbook-free-editor" aria-label="Çalışma sayfası düzenleyicisi">
    {document.blocks.length === 0 ? <p className="workbook-editor-empty">Bu derste henüz içerik yok. İlk bloğu ekleyin.</p> : null}
    {document.blocks.map((block, index) => {
      const isExercise = block.kind === 'blank' || block.kind === 'choice' || block.kind === 'reflection';
      if (isExercise) exerciseNumber += 1;
      const blockExerciseNumber = isExercise ? exerciseNumber : undefined;
      const selected = selectedId === block.id;
      return <Fragment key={block.id}>
        <BlockInsertMenu label={index === 0 ? 'Üste blok ekle' : 'Araya blok ekle'} onInsert={kind => insert(index, kind)} />
        <section className="workbook-canvas-block" data-selected={selected} onClick={() => setSelectedId(block.id)} onFocus={() => setSelectedId(block.id)} tabIndex={0} aria-label={`${workbookBlockLabel(block.kind)} bloğu`}>
          {selected ? <BlockContextToolbar block={block} first={index === 0} last={index === document.blocks.length - 1}
            onTone={tone => update({ ...block, tone })} onStyle={style => update({ ...block, style })}
            onMove={direction => onChange(moveBlock(document.blocks, block.id, direction))}
            onDuplicate={() => { const copy = duplicateWorkbookBlock(block, document.blocks); const next = [...document.blocks.slice(0, index + 1), copy, ...document.blocks.slice(index + 1)]; onChange(next); setSelectedId(copy.id); setFocusId(copy.id); }}
            onRemove={() => { const label = workbookBlockLabel(block.kind); const target = 'title' in block && typeof block.title === 'string' && block.title.trim() ? `${label}: “${block.title}”` : label; if (window.confirm(`${target} bloğu silinsin mi?`)) { onChange(document.blocks.filter(item => item.id !== block.id)); setSelectedId(null); setFocusId(null); } }} /> : null}
          {selected ? <SelectedBlockFields block={block} exerciseNumber={blockExerciseNumber} focusOnMount={focusId === block.id} onChange={next => { update(next); setFocusId(null); }} onRequestMedia={onRequestMedia} /> : <WorkbookBlockView block={block} exerciseNumber={blockExerciseNumber} answerMode="preview" />}
        </section>
      </Fragment>;
    })}
    <BlockInsertMenu label="Sona blok ekle" onInsert={kind => insert(document.blocks.length, kind)} />
  </div>;
}
