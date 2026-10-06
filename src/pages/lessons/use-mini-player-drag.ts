import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { clampMiniPosition, miniCornerForKey, nearestMiniCorner, type MiniCorner, type MiniPoint, type MiniSize } from './lesson-player-position';

type DragSession = {
  pointerId: number;
  handle: HTMLButtonElement;
  start: MiniPoint;
  offset: MiniPoint;
  size: MiniSize;
  moved: boolean;
};

export function useMiniPlayerDrag(player: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [corner, setCorner] = useState<MiniCorner>('top-right');
  const [point, setPoint] = useState<MiniPoint | null>(null);
  const session = useRef<DragSession | null>(null);

  const cancel = () => {
    const active = session.current;
    session.current = null;
    setPoint(null);
    if (active?.handle.hasPointerCapture(active.pointerId)) active.handle.releasePointerCapture(active.pointerId);
  };

  useEffect(() => {
    const reset = () => {
      const active = session.current;
      session.current = null;
      setPoint(null);
      if (active?.handle.hasPointerCapture(active.pointerId)) active.handle.releasePointerCapture(active.pointerId);
    };
    window.addEventListener('resize', reset);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('resize', reset);
      window.removeEventListener('blur', reset);
      const active = session.current;
      session.current = null;
      if (active?.handle.hasPointerCapture(active.pointerId)) active.handle.releasePointerCapture(active.pointerId);
    };
  }, []);

  const positionAt = (event: PointerEvent<HTMLButtonElement>, active: DragSession) => {
    const gap = Number.parseFloat(getComputedStyle(player.current!).getPropertyValue('--lesson-mini-gap')) || 20;
    return clampMiniPosition({ x: event.clientX - active.offset.x, y: event.clientY - active.offset.y }, active.size,
      { width: window.innerWidth, height: window.innerHeight }, gap);
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!enabled || !player.current || event.button !== 0 || !event.isPrimary || session.current) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    const rect = player.current.getBoundingClientRect();
    session.current = {
      pointerId: event.pointerId, handle: event.currentTarget, start: { x: event.clientX, y: event.clientY },
      offset: { x: event.clientX - rect.left, y: event.clientY - rect.top },
      size: { width: rect.width, height: rect.height }, moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const active = session.current;
    if (!active || active.pointerId !== event.pointerId || !enabled || !player.current) return;
    if (!active.moved && Math.hypot(event.clientX - active.start.x, event.clientY - active.start.y) < 4) return;
    active.moved = true;
    setPoint(positionAt(event, active));
  };
  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const active = session.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (active.moved && enabled && player.current) setCorner(nearestMiniCorner(positionAt(event, active), active.size,
      { width: window.innerWidth, height: window.innerHeight }));
    cancel();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!enabled) return;
    const next = miniCornerForKey(corner, event.key);
    if (next || event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancel();
      if (next) setCorner(next);
    }
  };

  const style: CSSProperties | undefined = enabled && point ? { top: point.y, left: point.x, bottom: 'auto', right: 'auto' } : undefined;
  return {
    corner, style, dragging: enabled && point !== null, cancel,
    handleProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: cancel, onLostPointerCapture: cancel, onKeyDown },
  };
}
