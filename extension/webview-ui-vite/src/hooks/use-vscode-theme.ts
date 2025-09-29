import { useState, useEffect } from 'react';

interface VSCodeTheme {
  kind: string | null;
  name: string | null;
}

export function useVSCodeTheme(): VSCodeTheme {
  const [theme, setTheme] = useState<VSCodeTheme>({
    kind: document.body.getAttribute("data-vscode-theme-kind"),
    name: document.body.getAttribute("data-vscode-theme-name"),
  });

  useEffect(() => {
    // Create observer for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes") {
          setTheme({
            kind: document.body.getAttribute("data-vscode-theme-kind"),
            name: document.body.getAttribute("data-vscode-theme-name"),
          });
        }
      });
    });

    // Start observing the body element
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-vscode-theme-kind", "data-vscode-theme-name"],
    });

    return () => observer.disconnect();
  }, []);

  // Optional: listen for CSS variable changes
  useEffect(() => {
    const styleObserver = new MutationObserver(() => {
      // Handle CSS variable changes
      const style = getComputedStyle(document.documentElement);
      // Access updated CSS variables...
    });

    styleObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });

    return () => styleObserver.disconnect();
  }, []);

  return theme;
}
