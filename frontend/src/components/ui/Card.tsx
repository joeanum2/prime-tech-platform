import { cn } from "@/lib/cn";
import type { HTMLAttributes, PropsWithChildren } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-text", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

export function CardFooter({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("mt-4 flex items-center justify-between", className)}>{children}</div>;
}
