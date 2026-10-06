import { useEffect } from "react";

const BLOCKED_SHORTCUTS = new Set(["a", "c", "x"]);

function clearSelection() {
  window.getSelection()?.removeAllRanges();
}

function restoreAttribute(
  element: HTMLElement,
  name: string,
  previousValue: string | null,
) {
  if (previousValue === null) {
    element.removeAttribute(name);
    return;
  }

  element.setAttribute(name, previousValue);
}

export function useResultScreenProtection() {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const rootTranslate = root.getAttribute("translate");
    const bodyTranslate = body.getAttribute("translate");
    const rootHadNoTranslate = root.classList.contains("notranslate");
    const bodyHadNoTranslate = body.classList.contains("notranslate");
    const rootUserSelect = root.style.getPropertyValue("user-select");
    const bodyUserSelect = body.style.getPropertyValue("user-select");
    const rootWebkitUserSelect = root.style.getPropertyValue("-webkit-user-select");
    const bodyWebkitUserSelect = body.style.getPropertyValue("-webkit-user-select");

    root.setAttribute("translate", "no");
    body.setAttribute("translate", "no");
    root.classList.add("notranslate");
    body.classList.add("notranslate");
    root.style.setProperty("user-select", "none");
    body.style.setProperty("user-select", "none");
    root.style.setProperty("-webkit-user-select", "none");
    body.style.setProperty("-webkit-user-select", "none");
    clearSelection();

    const preventInteraction = (event: Event) => {
      event.preventDefault();
      clearSelection();
    };

    const preventProtectedShortcut = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isSelectionShortcut =
        (event.ctrlKey || event.metaKey) && BLOCKED_SHORTCUTS.has(key);
      const isContextMenuShortcut =
        event.key === "ContextMenu" || (event.shiftKey && event.key === "F10");

      if (!isSelectionShortcut && !isContextMenuShortcut) return;

      event.preventDefault();
      clearSelection();
    };

    document.addEventListener("contextmenu", preventInteraction, true);
    document.addEventListener("selectionstart", preventInteraction, true);
    document.addEventListener("copy", preventInteraction, true);
    document.addEventListener("cut", preventInteraction, true);
    document.addEventListener("dragstart", preventInteraction, true);
    document.addEventListener("keydown", preventProtectedShortcut, true);

    return () => {
      document.removeEventListener("contextmenu", preventInteraction, true);
      document.removeEventListener("selectionstart", preventInteraction, true);
      document.removeEventListener("copy", preventInteraction, true);
      document.removeEventListener("cut", preventInteraction, true);
      document.removeEventListener("dragstart", preventInteraction, true);
      document.removeEventListener("keydown", preventProtectedShortcut, true);

      restoreAttribute(root, "translate", rootTranslate);
      restoreAttribute(body, "translate", bodyTranslate);

      if (!rootHadNoTranslate) root.classList.remove("notranslate");
      if (!bodyHadNoTranslate) body.classList.remove("notranslate");

      root.style.setProperty("user-select", rootUserSelect);
      body.style.setProperty("user-select", bodyUserSelect);
      root.style.setProperty("-webkit-user-select", rootWebkitUserSelect);
      body.style.setProperty("-webkit-user-select", bodyWebkitUserSelect);
    };
  }, []);
}
