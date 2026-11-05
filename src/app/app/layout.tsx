import { requireAdmin } from "@/lib/auth";
import { usingSupabase } from "@/lib/db";
import { Logo } from "@/components/ui";
import { AdminNav } from "@/components/admin-nav";
import { logout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Console", robots: { index: false } };

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  await requireAdmin();
  const supa = usingSupabase();
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-card px-4 py-5 md:flex">
        <Logo className="px-2" />
        <AdminNav />
        <div className="mt-auto space-y-3 px-2">
          <div className="label">Storage: {supa ? "Supabase" : "Local file"}</div>
          <form action={logout}>
            <button className="text-sm text-muted hover:text-ink">Log out</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-line bg-card px-5 py-3 md:hidden">
          <Logo />
          <AdminNav mobile />
        </div>
        <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
