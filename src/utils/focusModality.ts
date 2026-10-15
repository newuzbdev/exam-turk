/** Radix can move focus when a menu opens with the mouse or a touch. */
export function installFocusModality() {
  const root = document.documentElement;
  const onPointerDown = () => { root.dataset.focusModality = "pointer"; };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey ||
        ["Shift", "Control", "Alt", "Meta"].includes(event.key)) return;
    root.dataset.focusModality = "keyboard";
  };

  // Capture before component handlers move focus or stop propagation.
  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("keydown", onKeyDown, true);
  return () => {
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("keydown", onKeyDown, true);
    delete root.dataset.focusModality;
  };
}
