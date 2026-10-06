import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import BlockStyleControls from './BlockStyleControls';
import { workbookBlockLabel } from './document-utils';
import type { Tone, WorkbookBlock } from './types';

export default function BlockContextToolbar({ block, first, last, onMove, onDuplicate, onRemove, onStyle, onTone }: {
  block: WorkbookBlock; first: boolean; last: boolean; onMove: (direction: -1 | 1) => void; onDuplicate: () => void; onRemove: () => void; onStyle: (style: WorkbookBlock['style']) => void; onTone: (tone: Tone) => void;
}) {
  return <div className="workbook-context-chrome">
    <div className="workbook-context-toolbar" aria-label="Seçili blok araçları">
      <span className="workbook-block-kind">{workbookBlockLabel(block.kind)}</span>
      <label className="workbook-tone-select">Ton <select value={block.tone} onChange={event => onTone(event.target.value as Tone)}><option value="plain">Sade</option><option value="gray">Gri</option><option value="green">Yeşil</option><option value="yellow">Sarı</option></select></label>
      <button type="button" aria-label="Bloğu yukarı taşı" title="Yukarı taşı" disabled={first} onClick={() => onMove(-1)}><ArrowUp size={15} /></button>
      <button type="button" aria-label="Bloğu aşağı taşı" title="Aşağı taşı" disabled={last} onClick={() => onMove(1)}><ArrowDown size={15} /></button>
      <button type="button" aria-label="Bloğu çoğalt" title="Çoğalt" onClick={onDuplicate}><Copy size={15} /></button>
      <button type="button" aria-label="Bloğu sil" title="Sil" onClick={onRemove}><Trash2 size={15} /></button>
    </div>
    <BlockStyleControls style={block.style} onChange={onStyle} />
  </div>;
}
