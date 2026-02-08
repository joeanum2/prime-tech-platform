import type { PropsWithChildren } from "react";

export function LayoutShell({
  title,
  description,
  children
}: PropsWithChildren<{ title?: string; description?: string }>) {
  return (
    <section className="mx-auto w-full max-w-6xl rounded-3xl border bg-surface px-4 py-10 shadow-card sm:px-6">
      {title ? (
        <div className="mb-6 space-y-2">
          <h1 className="page-title">{title}</h1>
          {description ? <p className="text-sm text-muted">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
