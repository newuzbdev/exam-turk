export const PRACTICE_PRESENTATION_EVENT = "tm:practice-presentation";
export const PRACTICE_NAVIGATION_REQUEST_EVENT =
  "tm:practice-navigation-request";

export const isReadingPracticeSessionPath = (pathname: string) =>
  /^\/app\/pratik\/(?:okuma|dinleme|yazma|konusma)\/[^/]+\/?$/.test(
    pathname,
  );

export const setPracticePresentation = (focused: boolean) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ focused: boolean }>(PRACTICE_PRESENTATION_EVENT, {
      detail: { focused },
    }),
  );
};

export const requestPracticeNavigation = (to: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ to: string }>(PRACTICE_NAVIGATION_REQUEST_EVENT, {
      detail: { to },
    }),
  );
};
