type VendorFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitCurrentFullScreenElement?: Element | null;
  webkitIsFullScreen?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitCancelFullScreen?: () => Promise<void> | void;
  msFullscreenElement?: Element | null;
  msExitFullscreen?: () => Promise<void> | void;
};

type VendorFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

export const EXAM_FULLSCREEN_EVENTS = [
  "fullscreenchange",
  "webkitfullscreenchange",
  "MSFullscreenChange",
] as const;

export const getExamFullscreenElement = (): Element | null => {
  if (typeof document === "undefined") return null;
  const vendorDocument = document as VendorFullscreenDocument;
  return (
    document.fullscreenElement ||
    vendorDocument.webkitFullscreenElement ||
    vendorDocument.webkitCurrentFullScreenElement ||
    (vendorDocument.webkitIsFullScreen ? document.documentElement : null) ||
    vendorDocument.msFullscreenElement ||
    null
  );
};

export const getMobileExamPresentationElement = (): Element | null => {
  if (typeof document === "undefined") return null;
  return document.documentElement.dataset.mobileExamPresentation === "active"
    ? document.documentElement
    : null;
};

export const activateMobileExamPresentation = (): boolean => {
  if (typeof document === "undefined" || typeof navigator === "undefined") return false;
  const mobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!mobileDevice) return false;
  // A separate exam view keeps the native Fullscreen API state truthful.
  document.documentElement.dataset.mobileExamPresentation = "active";
  return true;
};

export const clearMobileExamPresentation = () => {
  if (typeof document !== "undefined") {
    delete document.documentElement.dataset.mobileExamPresentation;
  }
};

export const getExamPresentationElement = (): Element | null =>
  getExamFullscreenElement() || getMobileExamPresentationElement();

const nextPaint = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve();
    };
    const timeoutId = window.setTimeout(finish, 80);

    // Safari can suspend animation frames while its permission sheet is open.
    // The timeout keeps fullscreen cleanup from waiting forever in that state.
    window.requestAnimationFrame(finish);
  });

const waitForFullscreenState = (
  expectedActive: boolean,
  timeoutMs = 2500,
): Promise<boolean> =>
  new Promise((resolve) => {
    if (Boolean(getExamFullscreenElement()) === expectedActive) {
      resolve(true);
      return;
    }

    let settled = false;
    let timeoutId = 0;
    let pollId = 0;
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(pollId);
      EXAM_FULLSCREEN_EVENTS.forEach((eventName) => {
        document.removeEventListener(eventName, handleChange);
      });
    };
    const finish = () => {
      if (settled) return;
      const matches = Boolean(getExamFullscreenElement()) === expectedActive;
      if (!matches) return;
      settled = true;
      cleanup();
      resolve(true);
    };
    const handleChange = () => finish();
    timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(Boolean(getExamFullscreenElement()) === expectedActive);
    }, timeoutMs);
    // Some Safari versions update the vendor fullscreen fields without
    // reliably dispatching the matching document event.
    pollId = window.setInterval(finish, 50);

    EXAM_FULLSCREEN_EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, handleChange);
    });
  });

// Practice offers native fullscreen separately from its ordinary wide layout.
// Never report the mobile presentation fallback as browser fullscreen here.
export const requestNativeFullscreen = async (): Promise<boolean> => {
  if (typeof document === "undefined") return false;
  if (getExamFullscreenElement()) return true;
  const root = document.documentElement as VendorFullscreenElement;
  const request = root.requestFullscreen?.bind(root) ||
    root.webkitRequestFullscreen?.bind(root) ||
    root.webkitRequestFullScreen?.bind(root) ||
    root.msRequestFullscreen?.bind(root);
  if (!request) return false;
  try {
    await Promise.resolve(request());
    return waitForFullscreenState(true);
  } catch {
    return false;
  }
};

export const requestExamFullscreen = async (): Promise<boolean> => {
  if (typeof document === "undefined") return false;
  if (getExamPresentationElement()) return true;

  const root = document.documentElement as VendorFullscreenElement;
  const request =
    root.requestFullscreen?.bind(root) ||
    root.webkitRequestFullscreen?.bind(root) ||
    root.webkitRequestFullScreen?.bind(root) ||
    root.msRequestFullscreen?.bind(root);

  if (!request) return activateMobileExamPresentation();

  try {
    await Promise.resolve(request());
    return (await waitForFullscreenState(true)) || activateMobileExamPresentation();
  } catch {
    return activateMobileExamPresentation();
  }
};

export const exitExamFullscreen = async (): Promise<boolean> => {
  clearMobileExamPresentation();
  if (typeof document === "undefined") return true;
  if (!getExamFullscreenElement()) return true;

  const vendorDocument = document as VendorFullscreenDocument;
  const isLegacyWebkitFullscreen = Boolean(
    vendorDocument.webkitCurrentFullScreenElement ||
      vendorDocument.webkitIsFullScreen,
  );
  const candidates = isLegacyWebkitFullscreen
    ? [
        vendorDocument.webkitCancelFullScreen,
        vendorDocument.webkitExitFullscreen,
        document.exitFullscreen,
        vendorDocument.msExitFullscreen,
      ]
    : [
        document.exitFullscreen,
        vendorDocument.webkitExitFullscreen,
        vendorDocument.webkitCancelFullScreen,
        vendorDocument.msExitFullscreen,
      ];
  const attempted = new Set<unknown>();

  for (const candidate of candidates) {
    if (!candidate || attempted.has(candidate)) continue;
    attempted.add(candidate);

    try {
      await Promise.resolve(candidate.call(document));
      await nextPaint();
      if (!getExamFullscreenElement()) return true;
    } catch {
      // Safari versions expose different exit methods. Try the next one.
    }
  }

  return waitForFullscreenState(false, 1200);
};

export const activateExamPresentation = () => {
  if (typeof document === "undefined") return;
  document.body.classList.add("exam-mode");
  document.documentElement.classList.add("exam-mode");
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
};

const removeExamPresentationStyles = () => {
  if (typeof document === "undefined") return;
  document.body.classList.remove("exam-mode");
  document.documentElement.classList.remove("exam-mode");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("overflow-y");
  document.documentElement.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("overflow-y");
};

export const clearExamPresentation = async (): Promise<boolean> => {
  if (typeof document === "undefined") return true;

  removeExamPresentationStyles();

  let exited = await exitExamFullscreen();
  if (!exited && getExamFullscreenElement()) {
    exited = await exitExamFullscreen();
  }

  // Safari can dispatch its fullscreen event after the exit promise resolves.
  removeExamPresentationStyles();
  return exited && !getExamFullscreenElement();
};
