import { cn } from "@/lib/cn";
import type { HTMLAttributes, PropsWithChildren } from "react";

const variants = {
  success: "border-success bg-[#f1f7f2] text-success",
  warning: "border-warning bg-[#fff7eb] text-warning",
  error: "border-error bg-[#fdecec] text-error",
  info: "border-border bg-[#f3f3f0] text-text"
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
  ...props
}: PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof variants; title?: string }
>) {
  return (
    <div
      className={cn("rounded-2xl border px-4 py-3 text-sm", variants[variant], className)}
      role={variant === "error" ? "alert" : "status"}
      {...props}
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      {children}
    </div>
  );
}
