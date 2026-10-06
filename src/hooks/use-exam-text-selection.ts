import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { getReadingSelectionEndRect } from "@/lib/reading-selection-toolbar-position";

export interface ExamTextSelection {
  start: number;
  end: number;
  viewportX: number;
  viewportTop: number;
  viewportBottom: number;
}

interface UseExamTextSelectionOptions<T extends HTMLElement> {
  containerRef: RefObject<T | null>;
  anchorAtSelectionEnd?: boolean;
  disabled?: boolean;
  onSelection: (selection: ExamTextSelection) => void;
  onSelectionStart?: () => void;
  text: string;
}

interface DragState {
  anchorOffset: number;
  moved: boolean;
  pointerId: number;
  startX: number;
  startY: number;
}

type CaretDocument = Document & {
  caretPositionFromPoint?: (
    x: number,
    y: number,
  ) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

const isInside = (container: HTMLElement, node: Node) =>
  node === container || container.contains(node);

const getTextOffsetAtPoint = (
  container: HTMLElement,
  clientX: number,
  clientY: number,
  textLength: number,
) => {
  const documentWithCaret = container.ownerDocument as CaretDocument;
  const caretPosition = documentWithCaret.caretPositionFromPoint?.(
    clientX,
    clientY,
  );
  const fallbackRange = caretPosition
    ? null
    : documentWithCaret.caretRangeFromPoint?.(clientX, clientY);
  const node = caretPosition?.offsetNode ?? fallbackRange?.startContainer;
  const offset = caretPosition?.offset ?? fallbackRange?.startOffset;

  if (!node || offset === undefined || !isInside(container, node)) return null;

  try {
    const preCaretRange = container.ownerDocument.createRange();
    preCaretRange.selectNodeContents(container);
    preCaretRange.setEnd(node, offset);
    return Math.min(
      textLength,
      Math.max(0, preCaretRange.toString().length),
    );
  } catch {
    return null;
  }
};

const getDomPointAtTextOffset = (
  container: HTMLElement,
  requestedOffset: number,
) => {
  const walker = container.ownerDocument.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
  );
  let consumed = 0;
  let current = walker.nextNode();
  let lastTextNode: Text | null = null;

  while (current) {
    const textNode = current as Text;
    const length = textNode.data.length;
    lastTextNode = textNode;

    if (requestedOffset <= consumed + length) {
      return {
        node: textNode,
        offset: Math.max(0, requestedOffset - consumed),
      };
    }

    consumed += length;
    current = walker.nextNode();
  }

  return lastTextNode
    ? { node: lastTextNode, offset: lastTextNode.data.length }
    : null;
};

const getTextRangeGeometry = (
  container: HTMLElement,
  start: number,
  end: number,
) => {
  const startPoint = getDomPointAtTextOffset(container, start);
  const endPoint = getDomPointAtTextOffset(container, end);
  if (!startPoint || !endPoint) return null;

  try {
    const range = container.ownerDocument.createRange();
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
    return {
      selectionRect: range.getBoundingClientRect(),
      endRect: getReadingSelectionEndRect(range),
    };
  } catch {
    return null;
  }
};

const normalizeSelection = (text: string, anchor: number, focus: number) => {
  let start = Math.max(0, Math.min(anchor, focus));
  let end = Math.min(text.length, Math.max(anchor, focus));

  while (start < end && /\s/.test(text[start])) start += 1;
  while (end > start && /\s/.test(text[end - 1])) end -= 1;

  return end > start ? { start, end } : null;
};

export function useExamTextSelection<T extends HTMLElement>({
  containerRef,
  anchorAtSelectionEnd = false,
  disabled = false,
  onSelection,
  onSelectionStart,
  text,
}: UseExamTextSelectionOptions<T>) {
  const dragRef = useRef<DragState | null>(null);
  const [previewSelection, setPreviewSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);

  useEffect(() => {
    dragRef.current = null;
    setPreviewSelection(null);
  }, [text]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<T>) => {
      if (
        disabled ||
        event.pointerType === "touch" ||
        event.button !== 0 ||
        (event.target as Element).closest(
          'mark,[data-exam-selection-ignore="true"]',
        )
      ) {
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const anchorOffset = getTextOffsetAtPoint(
        container,
        event.clientX,
        event.clientY,
        text.length,
      );
      if (anchorOffset === null) return;

      event.preventDefault();
      event.stopPropagation();
      window.getSelection()?.removeAllRanges();
      onSelectionStart?.();
      setPreviewSelection(null);
      dragRef.current = {
        anchorOffset,
        moved: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [containerRef, disabled, onSelectionStart, text.length],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<T>) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container || drag.pointerId !== event.pointerId) return;

      event.preventDefault();
      event.stopPropagation();

      if (
        !drag.moved &&
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 6
      ) {
        drag.moved = true;
      }
      if (!drag.moved) return;

      const focusOffset = getTextOffsetAtPoint(
        container,
        event.clientX,
        event.clientY,
        text.length,
      );
      if (focusOffset === null) return;

      setPreviewSelection(
        normalizeSelection(text, drag.anchorOffset, focusOffset),
      );
    },
    [containerRef, text],
  );

  const finishSelection = useCallback(
    (event: ReactPointerEvent<T>) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container || drag.pointerId !== event.pointerId) return;

      event.preventDefault();
      event.stopPropagation();
      const focusOffset = getTextOffsetAtPoint(
        container,
        event.clientX,
        event.clientY,
        text.length,
      );
      const bounds =
        drag.moved && focusOffset !== null
          ? normalizeSelection(text, drag.anchorOffset, focusOffset)
          : null;
      const geometry = bounds
        ? getTextRangeGeometry(container, bounds.start, bounds.end)
        : null;

      if (
        event.currentTarget.hasPointerCapture?.(event.pointerId)
      ) {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }
      dragRef.current = null;
      setPreviewSelection(null);
      window.getSelection()?.removeAllRanges();

      if (bounds && geometry) {
        const anchorRect = anchorAtSelectionEnd
          ? geometry.endRect
          : geometry.selectionRect;
        onSelection({
          ...bounds,
          viewportX: anchorAtSelectionEnd
            ? anchorRect.right
            : anchorRect.left + anchorRect.width / 2,
          viewportTop: anchorRect.top,
          viewportBottom: anchorRect.bottom,
        });
      }
    },
    [anchorAtSelectionEnd, containerRef, onSelection, text],
  );

  const cancelSelection = useCallback((event: ReactPointerEvent<T>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setPreviewSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const stopAnswerClick = useCallback(
    (event: React.MouseEvent<T>) => event.stopPropagation(),
    [],
  );

  return {
    previewSelection,
    selectionHandlers: {
      onClick: stopAnswerClick,
      onPointerCancel: cancelSelection,
      onPointerDown,
      onPointerMove,
      onPointerUp: finishSelection,
    },
  };
}
