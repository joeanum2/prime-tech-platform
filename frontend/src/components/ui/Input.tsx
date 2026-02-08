import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description?: string;
  error?: string;
};

export function Input({ label, description, error, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-text">
        {label}
      </label>
      {description ? <p className="text-xs text-muted">{description}</p> : null}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          error ? "border-error" : "",
          className
        )}
        {...props}
      />
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
