import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 text-sm text-muted sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-text">Prime Tech Services</p>
            <p>Trusted software services and managed releases.</p>
          </div>
          <div className="flex gap-4">
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
        <p className="text-xs">© 2026 Prime Tech Services. All rights reserved.</p>
      </div>
    </footer>
  );
}
