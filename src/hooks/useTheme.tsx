import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme;
    return stored || "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (theme: Theme) => {
      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        root.classList.toggle("dark", systemTheme === "dark");
      } else {
        root.classList.toggle("dark", theme === "dark");
      }
    };

    applyTheme(theme);
    localStorage.setItem("theme", theme);

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme]);

  return { theme, setTheme: setThemeState };
}
