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
  variant?: "line" | "grip"
}

export const ResizableHandle = React.forwardRef<HTMLDivElement, ResizableHandleProps>(
  ({ className, withHandle = true, variant = "grip", ...props }, ref) => (
    <PanelResizeHandle
      className={cn(
        // Base line for vertical group (horizontal split)
        "bg-gray-400 relative z-40 flex select-none items-center justify-center rounded-md touch-none shadow-sm",
        // Size + margins per orientation
        "mx-1 w-2.5 cursor-ew-resize data-[panel-group-direction=vertical]:mx-0 data-[panel-group-direction=vertical]:my-2 data-[panel-group-direction=vertical]:h-2.5 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-ns-resize",
        // Hit area and states
        "data-[resize-handle-state=drag]:bg-primary/50 data-[resize-handle-state=hover]:bg-foreground/40",
        className
      )}
      aria-label="Resize"
      {...props}
    >
      {withHandle ? (
        variant === "grip" ? (
          <div className="pointer-events-none flex h-16 w-4 items-center justify-center rounded data-[panel-group-direction=vertical]:h-4 data-[panel-group-direction=vertical]:w-16">
            <div className="flex flex-col items-center gap-1.5 data-[panel-group-direction=vertical]:flex-row">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-600/80" />
              <span className="h-1.5 w-1.5 rounded-full bg-gray-600/80" />
              <span className="h-1.5 w-1.5 rounded-full bg-gray-600/80" />
            </div>
          </div>
        ) : (
          <div className="bg-muted-foreground/30 pointer-events-none flex h-16 w-1.5 items-center justify-center rounded data-[panel-group-direction=vertical]:h-1.5 data-[panel-group-direction=vertical]:w-16">
            <div className="h-12 w-0.5 bg-muted-foreground/70 data-[panel-group-direction=vertical]:h-0.5 data-[panel-group-direction=vertical]:w-12" />
          </div>
        )
      ) : null}
    </PanelResizeHandle>
  )
)
ResizableHandle.displayName = "ResizableHandle"
