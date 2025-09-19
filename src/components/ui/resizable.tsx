import * as React from "react"
import { PanelGroup, Panel, type PanelGroupProps, type PanelProps, PanelResizeHandle, type PanelResizeHandleProps } from "react-resizable-panels"
import { cn } from "@/lib/utils"

export type ResizablePanelGroupProps = PanelGroupProps & {
  className?: string
}

export function ResizablePanelGroup({ className, ...props }: ResizablePanelGroupProps) {
  return <PanelGroup className={cn("w-full", className)} {...props} />
}

export type ResizablePanelProps = PanelProps
export const ResizablePanel = Panel

export interface ResizableHandleProps extends PanelResizeHandleProps {
  withHandle?: boolean
}

export const ResizableHandle = React.forwardRef<HTMLDivElement, ResizableHandleProps>(
  ({ className, withHandle = true, ...props }, ref) => (
    <PanelResizeHandle
      ref={ref}
      className={cn(
        // Base line for vertical group (horizontal split)
        "bg-border relative mx-2 flex w-0.5 select-none items-center justify-center rounded-md",
        // Hit area
        "data-[resize-handle-state=drag]:bg-primary/40 data-[resize-handle-state=hover]:bg-foreground/30",
        className
      )}
      {...props}
    >
      {withHandle ? (
        <div className="bg-muted-foreground/30 pointer-events-none flex h-14 w-1 items-center justify-center rounded">
          <div className="h-10 w-px bg-muted-foreground/70" />
        </div>
      ) : null}
    </PanelResizeHandle>
  )
)
ResizableHandle.displayName = "ResizableHandle"
