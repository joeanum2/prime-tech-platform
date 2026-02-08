import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

const variants = {
  neutral: "bg-[color:var(--surface-muted)] text-muted",
  success: "bg-[#e6f4ea] text-success",
  warning: "bg-[#fff1da] text-warning",
  danger: "bg-[#fdecec] text-error"
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return <span className={cn("badge", variants[variant], className)} {...props} />;
}
