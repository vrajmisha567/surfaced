"use client";

import clsx from "clsx";
import { Moon, Sun } from "lucide-react";

/**
 * Runs in <head> before first paint, so a saved dark theme never flashes light. Light is the default.
 * A `?theme=dark` (or `light`) link previews that theme without changing the visitor's saved choice.
 */
export const themeScript = `try{var q=new URLSearchParams(location.search).get("theme");var t=q==="dark"||q==="light"?q:localStorage.getItem("theme");if(t==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export const iconBtn =
  "grid h-9 w-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Sun/moon switch. Which icon shows is pure CSS (globals.css), so server and client render the same. */
export function ThemeToggle({ className }: { className?: string }) {
  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      title="Light or dark mode"
      className={clsx(iconBtn, className)}
      onClick={() => {
        const root = document.documentElement;
        const next = root.dataset.theme === "dark" ? "light" : "dark";
        root.classList.add("theme-switching");
        root.dataset.theme = next;
        try {
          localStorage.setItem("theme", next);
        } catch {}
        window.setTimeout(() => root.classList.remove("theme-switching"), 400);
      }}
    >
      <Moon size={17} className="theme-icon-moon" aria-hidden />
      <Sun size={17} className="theme-icon-sun" aria-hidden />
    </button>
  );
}
