import React from "react";

/**
 * Blue corporate professional background:
 * - subtle blue wash gradients
 * - faint grid for structure
 * - clean, high-contrast content surface
 */
export function AppBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div aria-hidden className="fixed inset-0 -z-10" style={{ background: "rgb(var(--bg))" }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 520px at 15% 0%, var(--wash-1), transparent 60%)," +
              "radial-gradient(900px 520px at 85% 10%, var(--wash-2), transparent 62%)," +
              "radial-gradient(900px 620px at 50% 100%, var(--wash-3), transparent 65%)"
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(15,23,42,0.035) 1px, transparent 1px)," +
              "linear-gradient(to bottom, rgba(15,23,42,0.035) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(900px 500px at 50% 0%, rgba(0,0,0,0.85), transparent 70%)"
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(1200px 800px at 50% 30%, transparent 55%, rgba(2,6,23,0.05) 100%)"
          }}
        />
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}
