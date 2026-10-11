export const READING_SELECTION_TOOLBAR_WIDTH = 148;
export const READING_SELECTION_TOOLBAR_HEIGHT = 116;

export function getReadingSelectionEndRect(range: Range) {
  const lineRects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 || rect.height > 0,
  );
  return lineRects[lineRects.length - 1] || range.getBoundingClientRect();
}

interface ReadingSelectionToolbarPositionOptions {
  anchorX: number;
  selectionTop: number;
  selectionBottom: number;
  viewportWidth: number;
  viewportHeight: number;
  boundaryLeft?: number;
  boundaryRight?: number;
  bottomReserved?: number;
  gap?: number;
  padding?: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

export function getReadingSelectionToolbarPosition({
  anchorX,
  selectionTop,
  selectionBottom,
  viewportWidth,
  viewportHeight,
  boundaryLeft = 0,
  boundaryRight = viewportWidth,
  bottomReserved = 8,
  gap = 8,
  padding = 8,
}: ReadingSelectionToolbarPositionOptions) {
  const safeBoundaryLeft = Math.max(0, boundaryLeft);
  const safeBoundaryRight = Math.min(viewportWidth, boundaryRight);
  const boundaryCanContainToolbar =
    safeBoundaryRight - safeBoundaryLeft >=
    READING_SELECTION_TOOLBAR_WIDTH + padding * 2;
  const horizontalStart = boundaryCanContainToolbar
    ? safeBoundaryLeft + padding
    : padding;
  const horizontalEnd = boundaryCanContainToolbar
    ? safeBoundaryRight - padding
    : viewportWidth - padding;
  const maximumLeft = Math.max(
    horizontalStart,
    horizontalEnd - READING_SELECTION_TOOLBAR_WIDTH,
  );
  const left = clamp(
    anchorX - READING_SELECTION_TOOLBAR_WIDTH / 2,
    horizontalStart,
    maximumLeft,
  );

  const maximumTop = Math.max(
    padding,
    viewportHeight - bottomReserved - READING_SELECTION_TOOLBAR_HEIGHT,
  );
  const belowTop = selectionBottom + gap;
  const aboveTop = selectionTop - READING_SELECTION_TOOLBAR_HEIGHT - gap;
  const top =
    belowTop <= maximumTop
      ? belowTop
      : aboveTop >= padding
        ? aboveTop
        : clamp(belowTop, padding, maximumTop);

  return { left, top };
}

interface ReadingNoteEditorPositionOptions
  extends Omit<ReadingSelectionToolbarPositionOptions, "bottomReserved"> {
  editorWidth: number;
  editorHeight: number;
}

export function getReadingNoteEditorPosition({
  anchorX,
  selectionTop,
  selectionBottom,
  viewportWidth,
  viewportHeight,
  editorWidth,
  editorHeight,
  boundaryLeft = 0,
  boundaryRight = viewportWidth,
  gap = 8,
  padding = 12,
}: ReadingNoteEditorPositionOptions) {
  const width = Math.min(editorWidth, Math.max(0, viewportWidth - padding * 2));
  const height = Math.min(editorHeight, Math.max(0, viewportHeight - padding * 2));
  const safeBoundaryLeft = Math.max(0, boundaryLeft);
  const safeBoundaryRight = Math.min(viewportWidth, boundaryRight);
  const panelCanContainEditor =
    safeBoundaryRight - safeBoundaryLeft >= width + padding * 2;
  const horizontalStart = panelCanContainEditor
    ? safeBoundaryLeft + padding
    : padding;
  const horizontalEnd = panelCanContainEditor
    ? safeBoundaryRight - padding
    : viewportWidth - padding;
  const left = clamp(
    anchorX - width / 2,
    horizontalStart,
    Math.max(horizontalStart, horizontalEnd - width),
  );
  const maximumTop = Math.max(padding, viewportHeight - padding - height);
  const belowTop = selectionBottom + gap;
  const aboveTop = selectionTop - height - gap;
  const top =
    belowTop >= padding && belowTop <= maximumTop
      ? belowTop
      : aboveTop >= padding && aboveTop <= maximumTop
        ? aboveTop
        : clamp(belowTop, padding, maximumTop);

  return { left, top };
}
