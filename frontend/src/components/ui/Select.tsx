import { cn } from "@/lib/cn";
import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  description?: string;
  error?: string;
};

export function Select({ label, description, error, className, id, children, ...props }: SelectProps) {
  const selectId = id ?? props.name ?? label.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="text-sm font-semibold text-text">
        {label}
      </label>
      {description ? <p className="text-xs text-muted">{description}</p> : null}
      <select
        id={selectId}
        className={cn(
          "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          error ? "border-error" : "",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
