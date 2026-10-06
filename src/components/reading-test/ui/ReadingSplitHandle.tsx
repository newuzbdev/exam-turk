import { MoveHorizontal, MoveVertical } from "lucide-react";

import { ResizableHandle } from "@/components/ui/resizable";

interface ReadingSplitHandleProps {
  direction?: "horizontal" | "vertical";
  className?: string;
}

export default function ReadingSplitHandle({
  direction = "horizontal",
  className = "",
}: ReadingSplitHandleProps) {
  const isVertical = direction === "vertical";
  const Icon = isVertical ? MoveVertical : MoveHorizontal;

  return (
    <ResizableHandle
      withHandle={false}
      aria-label="Panelleri yeniden boyutlandır"
      title="Panelleri yeniden boyutlandır"
      className={
        isVertical
          ? `group !mx-0 !my-0 !h-3 !w-full !cursor-ns-resize !rounded-none !bg-transparent !shadow-none ${className}`
          : `group !mx-0 !w-3 !cursor-ew-resize !rounded-none !bg-transparent !shadow-none ${className}`
      }
    >
      <span
        aria-hidden="true"
        className={
          isVertical
            ? "pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#deded9] transition-colors group-hover:bg-[#b8b7b1]"
            : "pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#deded9] transition-colors group-hover:bg-[#b8b7b1]"
        }
      />
      <span className="pointer-events-none relative z-10 flex h-7 w-7 shrink-0 items-center justify-center text-[#5f6670] transition-colors group-hover:text-[#2f3742]">
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
    </ResizableHandle>
  );
}
