import { useEffect, useState } from "react";

export const isMobilePresentation = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 767px)").matches;

export function useMobilePresentation() {
  const [mobile, setMobile] = useState(isMobilePresentation);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return mobile;
}
