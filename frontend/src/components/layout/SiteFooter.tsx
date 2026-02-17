import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-slate-200/80 bg-white/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 text-sm text-slate-600 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="font-semibold uppercase tracking-wide text-slate-900">
              PRIME TECH &amp; CLINICAL SERVICES LTD
            </p>
            <p>Company No. 17020129</p>
            <p>Registered office: 71–75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ</p>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/contact">Contact</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
          </div>
        </div>
        <p className="text-xs text-slate-500">© {year} Prime Tech Services</p>
      </div>
    </footer>
  );
}
