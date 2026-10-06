import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { WorkbookBlock } from './types';

const choices: Array<{ kind: WorkbookBlock['kind']; label: string }> = [
  { kind: 'heading', label: 'Başlık' }, { kind: 'text', label: 'Metin' }, { kind: 'quote', label: 'Alıntı' }, { kind: 'tip', label: 'İpucu' },
  { kind: 'image', label: 'Görsel' }, { kind: 'table', label: 'Tablo' }, { kind: 'blank', label: 'Boşluk' }, { kind: 'choice', label: 'Seçenek' }, { kind: 'reflection', label: 'Açık uçlu' },
];

export default function BlockInsertMenu({ onInsert, label = 'Buraya blok ekle' }: { onInsert: (kind: WorkbookBlock['kind']) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  return <div className="workbook-insert-slot" data-open={open}>
    <button type="button" className="workbook-insert-trigger" aria-label={label} aria-expanded={open} onClick={() => setOpen(value => !value)}><Plus size={14} /><span>{label}</span></button>
    {open ? <div className="workbook-insert-menu" role="menu" aria-label="Blok türü seçin">{choices.map(choice => <button key={choice.kind} type="button" role="menuitem" onClick={() => { onInsert(choice.kind); setOpen(false); }}>{choice.label}</button>)}</div> : null}
  </div>;
}
