import { EllipsisVertical } from "lucide-react";
import { useRef, useState, type RefObject } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ListeningPracticeAudioPlayerProps {
  src: string;
  className?: string;
  audioRef?: RefObject<HTMLAudioElement | null>;
  onError?: () => void;
}

/** Native controls keep replay, seeking and playback speed available in practice. */
export default function ListeningPracticeAudioPlayer({
  src,
  className,
  audioRef: providedRef,
  onError,
}: ListeningPracticeAudioPlayerProps) {
  const internalRef = useRef<HTMLAudioElement>(null);
  const audioRef = providedRef ?? internalRef;
  const [playbackRate, setPlaybackRate] = useState("1");

  return (
    <div
      data-listening-practice-audio
      className={`flex min-w-0 items-center rounded-full bg-[#f1f3f4] pr-2 ${className || ""}`}
    >
      <audio
        ref={audioRef}
        controls
        controlsList="nodownload noplaybackrate noremoteplayback"
        preload="metadata"
        src={src}
        onError={onError}
        className="block h-10 min-w-0 flex-1"
        onRateChange={(event) =>
          setPlaybackRate(String(event.currentTarget.playbackRate))
        }
        aria-label="Dinleme pratiği ses oynatıcısı"
      />
      {/* The native speed popup opens above a navbar player and is clipped by the
          viewport. Keep native transport controls, but portal this menu below. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-8 shrink-0 items-center justify-center rounded-full text-[#202124] hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881]"
            aria-label="Oynatma hızı"
            title="Oynatma hızı"
          >
            <EllipsisVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-[180] w-44 border-[#dededb] bg-white text-[#37352f]"
        >
          <DropdownMenuLabel>Oynatma hızı</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={playbackRate}
            onValueChange={(value) => {
              if (audioRef.current) audioRef.current.playbackRate = Number(value);
            }}
          >
            {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
              <DropdownMenuRadioItem
                key={rate}
                value={String(rate)}
                className="min-h-9"
              >
                {rate === 1 ? "Normal" : `${rate}×`}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
