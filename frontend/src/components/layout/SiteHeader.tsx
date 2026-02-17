import Link from "next/link";

type SiteHeaderUser = {
  role: "USER" | "STAFF" | "ADMIN";
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/book", label: "Book" },
  { href: "/track", label: "Track" },
  { href: "/admin/bookings", label: "Admin" }
];

export function SiteHeader({ user: _user }: { user: SiteHeaderUser | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-3 text-text">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-slate-900 text-sm font-bold tracking-tight text-white shadow-md shadow-blue-900/20">
            PT
          </span>
          <span className="font-display text-lg font-semibold">Prime Tech Services</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 rounded-full border border-slate-200/80 bg-white/70 p-1 text-sm text-slate-700">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 font-medium transition-colors hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
