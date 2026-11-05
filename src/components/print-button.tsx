"use client";

import { Printer } from "lucide-react";
import { Button } from "./ui";

export function PrintButton({ label = "Save as PDF" }: { label?: string }) {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.print()} className="no-print">
      <Printer size={14} /> {label}
    </Button>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      type="button"
      onClick={(e) => {
        navigator.clipboard.writeText(text);
        const b = e.currentTarget;
        const prev = b.textContent;
        b.textContent = "Copied";
        setTimeout(() => (b.textContent = prev), 1200);
      }}
    >
      {label}
    </Button>
  );
}
