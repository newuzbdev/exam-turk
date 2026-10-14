import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { protectedImageProps } from "@/utils/mediaProtection";

import { useAnnotationState, annotationFingerprint } from "@/contexts/TextAnnotationsContext";

type MapPoint = { x: number; y: number };
type MapStroke = { tool: "draw" | "erase"; points: MapPoint[] };
const decodeStrokes = (value: unknown): MapStroke[] => Array.isArray(value) ? value.filter((stroke): stroke is MapStroke =>
  !!stroke && (stroke.tool === "draw" || stroke.tool === "erase") && Array.isArray(stroke.points) && stroke.points.length > 0 &&
  stroke.points.every((point: MapPoint) => point && Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1)) : [];

const DRAW_LINE_WIDTH = 2;
const ERASER_LINE_WIDTH = 24;

interface MapWithDrawingProps {
  src: string;
  annotationId: string;
  alt: string;
  className?: string;
  tool: "none" | "draw" | "erase";
  zoomed: boolean;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export default function MapWithDrawing({
  src,
  annotationId,
  alt,
  className,
  tool,
  zoomed,
  onError,
}: MapWithDrawingProps) {
  const [strokes, setStrokes] = useAnnotationState<MapStroke[]>(
    JSON.stringify(["map", annotationId, annotationFingerprint(src.split("?")[0])]), [], decodeStrokes,
  );
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;
  const activeStrokeRef = useRef<MapStroke | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const toolCursorRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isToolCursorVisible, setIsToolCursorVisible] = useState(false);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const all = activeStrokeRef.current ? [...strokesRef.current, activeStrokeRef.current] : strokesRef.current;
    for (const stroke of all) {
      const first = stroke.points[0];
      ctx.beginPath();
      ctx.globalCompositeOperation = stroke.tool === "erase" ? "destination-out" : "source-over";
      ctx.strokeStyle = "#e11d48";
      ctx.lineWidth = stroke.tool === "erase" ? ERASER_LINE_WIDTH : DRAW_LINE_WIDTH;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(first.x * canvas.width, first.y * canvas.height);
      if (stroke.points.length === 1) ctx.lineTo(first.x * canvas.width + 0.01, first.y * canvas.height + 0.01);
      for (const point of stroke.points.slice(1)) ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
      ctx.stroke();
      ctx.closePath();
    }
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const resizeCanvas = useCallback(() => {
    if (!imgRef.current || !canvasRef.current) return;
    const { clientWidth, clientHeight } = imgRef.current;
    if (!clientWidth || !clientHeight) return;
    const canvas = canvasRef.current;
    if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
      canvas.width = clientWidth;
      canvas.height = clientHeight;
    }
    redrawCanvas();
    setIsReady(true);
  }, [redrawCanvas]);

  useEffect(() => {
    if (!imgRef.current) return;
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(imgRef.current);
    resizeCanvas();
    return () => observer.disconnect();
  }, [resizeCanvas]);

  useEffect(() => { resizeCanvas(); }, [src, strokes, resizeCanvas]);
  useEffect(() => () => {
    const unfinished = activeStrokeRef.current;
    if (unfinished) setStrokes(current => [...current, unfinished]);
    activeStrokeRef.current = null;
  }, [setStrokes]);

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

  const normalizedPoint = (point: MapPoint, canvas: HTMLCanvasElement): MapPoint => ({
    x: Math.min(1, Math.max(0, point.x / canvas.width)),
    y: Math.min(1, Math.max(0, point.y / canvas.height)),
  });

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
    activeStrokeRef.current = { tool, points: [normalizedPoint(pt, canvas)] };
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
    activeStrokeRef.current?.points.push(normalizedPoint(pt, canvas));
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPointRef.current = pt;
  };

  const stopDrawing = (pointerId?: number) => {
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
    const finished = activeStrokeRef.current;
    activeStrokeRef.current = null;
    if (finished) setStrokes(current => [...current, finished]);
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
