import { useEffect, useRef, useState } from "react";

interface MapWithDrawingProps {
  src: string;
  alt: string;
  className?: string;
  drawEnabled: boolean;
  clearToken: number;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export default function MapWithDrawing({
  src,
  alt,
  className,
  drawEnabled,
  clearToken,
  onError,
}: MapWithDrawingProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [isReady, setIsReady] = useState(false);

  const resizeCanvas = () => {
    if (!imgRef.current || !canvasRef.current) return;
    const { clientWidth, clientHeight } = imgRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;
    canvasRef.current.width = clientWidth;
    canvasRef.current.height = clientHeight;
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [clearToken]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawEnabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    drawingRef.current = true;
    canvas.setPointerCapture(e.pointerId);
    const pt = getPoint(e);
    lastPointRef.current = pt;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.strokeStyle = "#e11d48";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawEnabled || !drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const pt = getPoint(e);
    const last = lastPointRef.current;
    if (!last) return;
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPointRef.current = pt;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawEnabled) return;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  return (
    <div className="relative w-full">
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={className}
        onError={onError}
        onLoad={() => resizeCanvas()}
      />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 ${drawEnabled ? "pointer-events-auto" : "pointer-events-none"} ${
          isReady ? "opacity-100" : "opacity-0"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
}
