import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const THEME_NAMES = ["original", "retro"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  cycleTheme: () => void;
};

const THEME_STORAGE_KEY = "ui.theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isThemeName = (value: unknown): value is ThemeName =>
  typeof value === "string" && (THEME_NAMES as readonly string[]).includes(value);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "original";
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeName(stored)) return stored;
    // Migrate old values from previous implementation.
    if (stored === "white" || stored === "gray" || stored === "black") return "retro";
    if (stored === "mono" || stored === "paper") return "retro";
    return "original";
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (theme === "original") {
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.setAttribute("data-theme", theme);
      }
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  const setTheme = (nextTheme: ThemeName) => {
    setThemeState(nextTheme);
  };

  const cycleTheme = () => {
    setThemeState((prev) => {
      const index = THEME_NAMES.indexOf(prev);
      const nextIndex = (index + 1) % THEME_NAMES.length;
      return THEME_NAMES[nextIndex];
    });
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      cycleTheme,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
