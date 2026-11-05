"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutGrid, Search, Users, FileText, Settings } from "lucide-react";

const items = [
  { href: "/app", label: "Overview", Icon: LayoutGrid },
  { href: "/app/prospects", label: "Prospects", Icon: Search },
  { href: "/app/clients", label: "Clients", Icon: Users },
  { href: "/app/audits", label: "Audits", Icon: FileText },
  { href: "/app/settings", label: "Integrations", Icon: Settings },
];

export function AdminNav({ mobile }: { mobile?: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));
  if (mobile) {
    return (
      <nav className="flex gap-1">
        {items.map(({ href, label, Icon }) => (
          <Link key={href} href={href} aria-label={label} className={clsx("rounded-md p-2", active(href) ? "bg-paper-2 text-ink" : "text-muted")}>
            <Icon size={17} />
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav className="mt-8 space-y-0.5">
      {items.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={clsx("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm", active(href) ? "bg-paper-2 font-medium text-ink" : "text-ink-2 hover:bg-paper")}
        >
          <Icon size={16} className={active(href) ? "text-accent" : "text-muted"} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
