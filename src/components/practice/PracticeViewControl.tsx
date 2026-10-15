import { useState } from 'react';
import { Expand, Maximize2, PanelLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { PracticePresentation, PracticeView } from '@/hooks/use-practice-presentation';

const modes = [
  { value: 'menu', label: 'Menülü görünüm', Icon: PanelLeft },
  { value: 'wide', label: 'Geniş görünüm', Icon: Expand },
  { value: 'fullscreen', label: 'Tam ekran', Icon: Maximize2 },
] as const;

export default function PracticeViewControl({ presentation }: { presentation: PracticePresentation }) {
  const [open, setOpen] = useState(false);
  const current = modes.find(mode => mode.value === presentation.mode)!;
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Görünüm: ${current.label}`} title="Görünüm"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#64645f] hover:bg-[#f1f1ee] hover:text-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96]">
          <current.Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[180] w-56 border-[#e5e5e2] bg-white text-[#37352f]">
        <DropdownMenuRadioGroup value={presentation.mode}>
          {modes.map(({ value, label, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value} disabled={presentation.busy}
              className="min-h-11 gap-2 focus:bg-[#f1f1ee] focus:text-[#242424]"
              onSelect={event => {
                event.preventDefault();
                void presentation.selectMode(value as PracticeView).then(changed => { if (changed) setOpen(false); });
              }}>
              <Icon className="h-4 w-4" aria-hidden="true" />{label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {presentation.error && <p role="alert" className="px-3 py-2 text-xs text-[#777570]">{presentation.error}</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
