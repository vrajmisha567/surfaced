import Link from "next/link";
import { Logo, LinkButton } from "./ui";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-ink-2 md:flex">
          <Link href="/#how" className="hover:text-ink">How it works</Link>
          <Link href="/#checks" className="hover:text-ink">What we check</Link>
          <Link href="/#pricing" className="hover:text-ink">Pricing</Link>
          <Link href="/#faq" className="hover:text-ink">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden px-2 text-sm text-ink-2 hover:text-ink sm:block">Log in</Link>
          <LinkButton href="/#audit" size="sm" className="fx-sheen">Free audit</LinkButton>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">AI search visibility for local businesses, in any city.</p>
        </div>
        <div className="text-sm">
          <div className="label mb-3">Product</div>
          <ul className="space-y-2 text-ink-2">
            <li><Link href="/#audit" className="hover:text-ink">Free audit</Link></li>
            <li><Link href="/#pricing" className="hover:text-ink">Pricing</Link></li>
            <li><Link href="/llms.txt" className="hover:text-ink">llms.txt</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="label mb-3">Contact</div>
          <ul className="space-y-2 text-ink-2">
            <li><a href={`mailto:${site.contactEmail}`} className="hover:text-ink">{site.contactEmail}</a></li>
            {site.abn && <li>ABN {site.abn}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="label mx-auto flex max-w-6xl justify-between px-5 py-4">
          <span>© {new Date().getFullYear()} {site.name}</span>
          <span>No one can guarantee AI rankings. We show you the evidence every week.</span>
        </div>
      </div>
    </footer>
  );
}
