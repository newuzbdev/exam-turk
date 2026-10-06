import { useState } from "react";

export type MembershipLanguage = "tr" | "uz";
const STORAGE_KEY = "turkishmock.membership-language";

export function useMembershipLanguage() {
  const [language, setLanguage] = useState<MembershipLanguage>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "uz" ? "uz" : "tr";
    } catch {
      return "tr";
    }
  });

  const selectLanguage = (next: MembershipLanguage) => {
    setLanguage(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The current choice still works when browser storage is unavailable.
    }
  };

  return [language, selectLanguage] as const;
}
