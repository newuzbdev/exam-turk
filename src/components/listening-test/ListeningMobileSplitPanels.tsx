import type { ReactNode } from "react";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import ReadingSplitHandle from "@/components/reading-test/ui/ReadingSplitHandle";
import { useMobilePresentation } from "@/hooks/use-mobile-presentation";

interface ListeningMobileSplitPanelsProps {
  upper: ReactNode;
  lower: ReactNode;
  className?: string;
  children: ReactNode;
}

export default function ListeningMobileSplitPanels({
  upper,
  lower,
  className = "",
  children,
}: ListeningMobileSplitPanelsProps) {
  const mobile = useMobilePresentation();
  if (!mobile) return children;

  return (
    <ResizablePanelGroup
      direction="vertical"
      className={`listening-mobile-split-panels h-full min-h-0 !flex overflow-hidden ${className}`}
    >
      <ResizablePanel defaultSize={45} minSize={25} maxSize={75}>
        {upper}
      </ResizablePanel>
      <ReadingSplitHandle direction="vertical" />
      <ResizablePanel defaultSize={55} minSize={25} maxSize={75}>
        <div className="reading-scroll listening-mobile-lower-panel h-full overflow-y-auto">
          {lower}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
