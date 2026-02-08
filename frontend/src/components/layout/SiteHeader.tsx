import Link from "next/link";

type SiteHeaderUser = {
  role: "USER" | "STAFF" | "ADMIN";
};

export function SiteHeader({ user }: { user: SiteHeaderUser | null }) {
  return (
    <header className="border-b bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold text-text">
          Prime Tech Services
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-muted">
          <Link href="/services">Services</Link>
          <Link href="/articles">Articles</Link>
          <Link href="/book">Book</Link>
          <Link href="/track">Track</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link href="/account" className="font-semibold text-primary">
                My account
              </Link>
              {user.role === "ADMIN" ? (
                <Link href="/admin" className="text-muted">
                  Admin
                </Link>
              ) : null}
            </>
          ) : (
            <span className="text-muted">Session required for account</span>
          )}
        </div>
      </div>
    </header>
  );
}
