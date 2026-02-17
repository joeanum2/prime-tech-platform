import type { PropsWithChildren } from "react";

export function LayoutShell({
  title,
  description,
  children
}: PropsWithChildren<{ title?: string; description?: string }>) {
  return (
    <section className="mx-auto my-8 w-full max-w-6xl rounded-3xl border border-slate-200/80 bg-white/85 px-4 py-8 shadow-card backdrop-blur-sm sm:my-10 sm:px-6 sm:py-10">
      {title ? (
        <div className="mb-7 space-y-2">
          <h1 className="page-title leading-tight">{title}</h1>
          {description ? <p className="max-w-3xl text-sm text-muted">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
