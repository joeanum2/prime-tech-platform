"use client";

import React, { useEffect, useState } from "react";

type Meta = { updatedAt?: string };

export function BrandLogo({ className }: { className?: string }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/branding/app-logo.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled) {
          setMeta(j);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const v = meta?.updatedAt ? encodeURIComponent(meta.updatedAt) : "";
  const src = meta ? `/branding/app-logo.png?ts=${v}` : null;

  if (src) {
    return <img src={src} alt="App logo" className={className} />;
  }

  if (!ready) {
    return null;
  }

  return (
    <span className={className} style={{ fontWeight: 800 }}>
      Prime Tech Services
    </span>
  );
}
