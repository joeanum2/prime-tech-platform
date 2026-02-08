import type { PropsWithChildren } from "react";

export function TableShell({ children }: PropsWithChildren) {
  return <div className="table-shell">{children}</div>;
}
