import { cn } from "@/lib/cn";

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} />;
}
