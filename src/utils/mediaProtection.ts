const MEDIA_SELECTOR = "img, audio, video";
const INSTALL_MARKER = "turkishmockMediaProtectionInstalled";

export const protectedImageProps = {
  crossOrigin: "anonymous",
  decoding: "async",
  draggable: false,
  referrerPolicy: "no-referrer",
} as const;

type ProtectedWindow = Window & {
  [INSTALL_MARKER]?: boolean;
};

function protectElement(element: Element) {
  if (element instanceof HTMLImageElement) {
    element.draggable = false;
    element.referrerPolicy = "no-referrer";
    return;
  }

  if (element instanceof HTMLMediaElement) {
    element.setAttribute("controlsList", "nodownload noremoteplayback");
    (
      element as HTMLMediaElement & { disableRemotePlayback?: boolean }
    ).disableRemotePlayback = true;
  }

  if (element instanceof HTMLVideoElement) {
    element.disablePictureInPicture = true;
  }
}

function protectTree(root: ParentNode) {
  if (root instanceof Element && root.matches(MEDIA_SELECTOR)) {
    protectElement(root);
  }
  root.querySelectorAll(MEDIA_SELECTOR).forEach(protectElement);
}

function mediaTarget(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest(MEDIA_SELECTOR) : null;
}

export function installMediaProtection() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const protectedWindow = window as ProtectedWindow;
  if (protectedWindow[INSTALL_MARKER]) return;
  protectedWindow[INSTALL_MARKER] = true;

  const apply = () => protectTree(document);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }

  document.addEventListener(
    "contextmenu",
    (event) => {
      if (mediaTarget(event.target)) event.preventDefault();
    },
    { capture: true },
  );
  document.addEventListener(
    "dragstart",
    (event) => {
      if (mediaTarget(event.target)) event.preventDefault();
    },
    { capture: true },
  );

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) protectTree(node);
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
