import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { protectedImageProps } from "@/utils/mediaProtection";

const DRAW_LINE_WIDTH = 2;
const ERASER_LINE_WIDTH = 24;

interface MapWithDrawingProps {
  src: string;
  alt: string;
  className?: string;
  tool: "none" | "draw" | "erase";
  zoomed: boolean;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export default function MapWithDrawing({
  src,
  alt,
  className,
  tool,
  zoomed,
  onError,
}: MapWithDrawingProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const toolCursorRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isToolCursorVisible, setIsToolCursorVisible] = useState(false);

  const resizeCanvas = () => {
    if (!imgRef.current || !canvasRef.current) return;
    const { clientWidth, clientHeight } = imgRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;
    const canvas = canvasRef.current;
    if (canvas.width === clientWidth && canvas.height === clientHeight) {
      setIsReady(true);
      return;
    }

    const previous = document.createElement("canvas");
    previous.width = canvas.width;
    previous.height = canvas.height;
    const previousContext = previous.getContext("2d");
    if (previousContext && canvas.width > 0 && canvas.height > 0) {
      previousContext.drawImage(canvas, 0, 0);
    }

    canvas.width = clientWidth;
    canvas.height = clientHeight;
    const context = canvas.getContext("2d");
    if (
      context &&
      previous.width > 0 &&
      previous.height > 0
    ) {
      context.drawImage(
        previous,
        0,
        0,
        previous.width,
        previous.height,
        0,
        0,
        clientWidth,
        clientHeight,
      );
    }
    setIsReady(true);
  };

  useEffect(() => {
    if (!imgRef.current) return;
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(imgRef.current);
    resizeCanvas();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    resizeCanvas();
  }, [src]);

  useEffect(() => {
    if (tool === "none") {
      setIsToolCursorVisible(false);
    }
  }, [tool]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const updateToolCursor = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (tool === "none" || e.pointerType === "touch") {
      setIsToolCursorVisible(false);
      return;
    }

    const point = getPoint(e);
    if (toolCursorRef.current) {
      toolCursorRef.current.style.left = `${point.x}px`;
      toolCursorRef.current.style.top = `${point.y}px`;
    }
    setIsToolCursorVisible(true);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "none") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    e.preventDefault();
    if (!e.isPrimary) return;
    updateToolCursor(e);

    drawingRef.current = true;
    activePointerIdRef.current = e.pointerId;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
    const pt = getPoint(e);
    lastPointRef.current = pt;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x + 0.01, pt.y + 0.01);
    ctx.globalCompositeOperation =
      tool === "erase" ? "destination-out" : "source-over";
    ctx.strokeStyle = "#e11d48";
    ctx.lineWidth =
      tool === "erase" ? ERASER_LINE_WIDTH : DRAW_LINE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    updateToolCursor(e);
    if (tool === "none" || !drawingRef.current) return;
    if (activePointerIdRef.current !== e.pointerId) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    e.preventDefault();
    const pt = getPoint(e);
    const last = lastPointRef.current;
    if (!last) return;
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPointRef.current = pt;
  };

  const stopDrawing = (pointerId?: number) => {
    if (tool === "none") return;
    if (pointerId != null && activePointerIdRef.current != null && pointerId !== activePointerIdRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (context) {
      context.closePath();
      context.globalCompositeOperation = "source-over";
    }
    if (canvas && activePointerIdRef.current != null) {
      try {
        if (canvas.hasPointerCapture(activePointerIdRef.current)) {
          canvas.releasePointerCapture(activePointerIdRef.current);
        }
      } catch {}
    }
    drawingRef.current = false;
    activePointerIdRef.current = null;
    lastPointRef.current = null;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    stopDrawing(e.pointerId);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsToolCursorVisible(false);
    // On touch devices leave can fire during normal movement; do not end stroke there.
    if (e.pointerType === "mouse") {
      stopDrawing(e.pointerId);
    }
  };

  return (
    <div
      className={`relative shrink-0 overflow-hidden transition-[width] duration-150 ${
        zoomed ? "w-[145%]" : "w-full"
      }`}
    >
      <img
        {...protectedImageProps}
        ref={imgRef}
        src={src}
        alt={alt}
        className={className}
        onError={onError}
        onLoad={() => resizeCanvas()}
      />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full ${
          tool === "none" ? "pointer-events-none" : "pointer-events-auto"
        } ${
          isReady ? "opacity-100" : "opacity-0"
        }`}
        style={{
          cursor: tool === "none" ? undefined : "none",
          touchAction: tool === "none" ? "auto" : "none",
        }}
        onPointerEnter={updateToolCursor}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />
      {tool !== "none" ? (
        <div
          ref={toolCursorRef}
          aria-hidden="true"
          data-map-tool-cursor={tool}
          className={`pointer-events-none absolute z-20 ${
            isToolCursorVisible
              ? "visible opacity-100"
              : "invisible opacity-0"
          }`}
        >
          {tool === "erase" ? (
            <div className="relative h-6 w-6 -translate-x-1/2 -translate-y-1/2">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                data-map-eraser-icon
                className="h-6 w-6 text-[#34332f] drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              >
                <path d="M12.586 3.586a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828z" />
                <path d="m5.082 11.09 8.828 8.828" />
              </svg>
            </div>
          ) : (
            <div className="relative h-6 w-6 -translate-x-0.5 -translate-y-[22px]">
              <Pencil
                className="h-6 w-6 text-[#34332f] drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]"
                strokeWidth={1.6}
              />
              <span className="absolute left-[0.5px] top-[20.5px] h-[3px] w-[3px] rounded-full bg-[#e11d48] shadow-[0_0_0_0.5px_rgba(255,255,255,0.9)]" />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
