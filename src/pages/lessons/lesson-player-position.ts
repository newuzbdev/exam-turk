export type MiniCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type MiniPoint = { x: number; y: number };
export type MiniSize = { width: number; height: number };

export function clampMiniPosition(point: MiniPoint, size: MiniSize, viewport: MiniSize, gap: number): MiniPoint {
  const minX = Math.min(gap, Math.max(0, viewport.width - size.width));
  const minY = Math.min(gap, Math.max(0, viewport.height - size.height));
  return {
    x: Math.max(minX, Math.min(point.x, viewport.width - size.width - gap)),
    y: Math.max(minY, Math.min(point.y, viewport.height - size.height - gap)),
  };
}

export function nearestMiniCorner(point: MiniPoint, size: MiniSize, viewport: MiniSize): MiniCorner {
  const vertical = point.y + size.height / 2 < viewport.height / 2 ? 'top' : 'bottom';
  const horizontal = point.x + size.width / 2 < viewport.width / 2 ? 'left' : 'right';
  return `${vertical}-${horizontal}`;
}

export function miniCornerForKey(corner: MiniCorner, key: string): MiniCorner | null {
  const vertical = corner.startsWith('top') ? 'top' : 'bottom';
  const horizontal = corner.endsWith('left') ? 'left' : 'right';
  if (key === 'ArrowLeft') return `${vertical}-left`;
  if (key === 'ArrowRight') return `${vertical}-right`;
  if (key === 'ArrowUp') return `top-${horizontal}`;
  if (key === 'ArrowDown') return `bottom-${horizontal}`;
  return null;
}
