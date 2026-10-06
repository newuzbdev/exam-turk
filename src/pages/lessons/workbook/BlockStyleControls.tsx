import { AlignCenter, AlignJustify, AlignLeft, AlignRight, RotateCcw } from 'lucide-react';
import { updateWorkbookStyle } from './block-style';
import type { WorkbookStyle } from './types';

const swatches = ['#37352F', '#587B58', '#80658F', '#FFF8E8', '#F0F6EF', '#FFFFFF'];
const alignments = [
  { value: 'left' as const, label: 'Sola hizala', icon: AlignLeft }, { value: 'center' as const, label: 'Ortala', icon: AlignCenter },
  { value: 'right' as const, label: 'Sağa hizala', icon: AlignRight }, { value: 'justify' as const, label: 'İki yana yasla', icon: AlignJustify },
];

export default function BlockStyleControls({ style, onChange }: { style?: WorkbookStyle; onChange: (style: WorkbookStyle | undefined) => void }) {
  const set = <K extends keyof WorkbookStyle>(key: K, value: WorkbookStyle[K] | undefined) => onChange(updateWorkbookStyle(style, key, value));
  return <div className="workbook-style-controls" aria-label="Blok görünümü">
    <div className="workbook-style-color"><span>Yazı</span><input type="color" aria-label="Yazı rengi" value={style?.textColor ?? '#37352F'} onChange={event => set('textColor', event.target.value)} /><div>{swatches.slice(0, 3).map(color => <button key={color} type="button" aria-label={`Yazı rengi ${color}`} style={{ backgroundColor: color }} onClick={() => set('textColor', color)} />)}<button type="button" className="is-reset" aria-label="Yazı rengini sıfırla" onClick={() => set('textColor', undefined)}><RotateCcw size={13} /></button></div></div>
    <div className="workbook-style-color"><span>Zemin</span><input type="color" aria-label="Zemin rengi" value={style?.backgroundColor ?? '#FFFFFF'} onChange={event => set('backgroundColor', event.target.value)} /><div>{swatches.slice(3).map(color => <button key={color} type="button" aria-label={`Zemin rengi ${color}`} style={{ backgroundColor: color }} onClick={() => set('backgroundColor', color)} />)}<button type="button" className="is-reset" aria-label="Zemin rengini sıfırla" onClick={() => set('backgroundColor', undefined)}><RotateCcw size={13} /></button></div></div>
    <label>Yazı boyutu <input type="number" min={12} max={48} value={style?.fontSize ?? ''} placeholder="Otomatik" onChange={event => set('fontSize', event.target.value ? Math.max(12, Math.min(48, Math.round(Number(event.target.value)))) : undefined)} /></label>
    <div className="workbook-align-controls" aria-label="Metin hizası">{alignments.map(({ value, label, icon: Icon }) => <button key={value} type="button" title={label} aria-label={label} aria-pressed={(style?.textAlign ?? 'left') === value} onClick={() => set('textAlign', value === 'left' ? undefined : value)}><Icon size={15} /></button>)}</div>
    <label className="workbook-width-control">Genişlik <input type="range" min={25} max={100} step={5} value={style?.width ?? 100} onChange={event => set('width', Number(event.target.value) === 100 ? undefined : Number(event.target.value))} /><output>{style?.width ?? 100}%</output></label>
    <button className="workbook-style-reset" type="button" onClick={() => onChange(undefined)}><RotateCcw size={13} /> Görünümü sıfırla</button>
  </div>;
}
