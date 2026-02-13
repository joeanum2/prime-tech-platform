"use client";

import React, { useMemo, useState } from "react";

type LogoConfig = {
  brandName: string;
  tagline: string;
  icon: "chip" | "bolt" | "wrench" | "shield" | "globe";
  shape: "rounded" | "square" | "pill";
  primary: string;
  accent: string;
  background: string;
  fontWeight: 500 | 600 | 700 | 800;
  exportSize: number; // px
};

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function svgToDataUri(svg: string) {
  // Robust encoding for <img src> preview
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

function svgToBlob(svg: string) {
  return new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
}

async function svgToPngBlob(svg: string, size: number, background: string) {
  const svgUrl = URL.createObjectURL(svgToBlob(svg));
  try {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG for PNG export"));
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context not available");

    // Background fill so PNG looks correct
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);

    // Draw SVG into canvas
    ctx.drawImage(img, 0, 0, size, size);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png");
    });

    return blob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

async function blobToBase64DataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Failed to convert blob to base64"));
    r.readAsDataURL(blob);
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function iconSvg(icon: LogoConfig["icon"], color: string) {
  // simple inline icon set
  switch (icon) {
    case "bolt":
      return `<path fill="${color}" d="M28 6L10 34h12l-2 24 20-32H28z"/>`;
    case "wrench":
      return `<path fill="${color}" d="M45 9a14 14 0 0 1-18 13L14 35l7 7 13-13A14 14 0 1 1 45 9z"/><path fill="${color}" d="M10 39l-2 2a4 4 0 0 0 0 6l1 1a4 4 0 0 0 6 0l2-2-7-7z"/>`;
    case "shield":
      return `<path fill="${color}" d="M32 6l18 8v14c0 14-8 26-18 30C22 54 14 42 14 28V14l18-8z"/><path fill="${color}" opacity="0.25" d="M32 10v44c8-4 14-14 14-26V16l-14-6z"/>`;
    case "globe":
      return `<circle cx="32" cy="32" r="22" fill="none" stroke="${color}" stroke-width="4"/><path d="M10 32h44" stroke="${color}" stroke-width="4"/><path d="M32 10c8 8 8 36 0 44M32 10c-8 8-8 36 0 44" fill="none" stroke="${color}" stroke-width="4"/>`;
    case "chip":
    default:
      return `<rect x="18" y="18" width="28" height="28" rx="6" fill="none" stroke="${color}" stroke-width="4"/>
              <path d="M12 24h6M12 32h6M12 40h6M46 24h6M46 32h6M46 40h6M24 12v6M32 12v6M40 12v6M24 46v6M32 46v6M40 46v6"
                stroke="${color}" stroke-width="4" stroke-linecap="round"/>`;
  }
}

function buildLogoSvg(cfg: LogoConfig) {
  const size = 512;
  const pad = 54;

  const rx =
    cfg.shape === "rounded" ? 64 :
    cfg.shape === "square"  ? 18 :
    999;

  const brand = cfg.brandName.trim() || "Prime Tech Services";
  const tag = cfg.tagline.trim() || "Repairs • Software • Managed Releases";

  // Layout
  const iconBox = { x: pad, y: pad, w: 130, h: 130 };
  const textX = iconBox.x + iconBox.w + 28;
  const brandY = iconBox.y + 70;
  const tagY = brandY + 44;

  const iconMark = iconSvg(cfg.icon, cfg.primary);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-opacity="0.25"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="${size}" height="${size}" rx="${rx}" fill="${cfg.background}"/>
  <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" rx="${Math.max(24, rx/3)}"
        fill="rgba(255,255,255,0.04)" filter="url(#shadow)"/>

  <!-- Icon -->
  <g transform="translate(${iconBox.x},${iconBox.y})">
    <rect x="0" y="0" width="${iconBox.w}" height="${iconBox.h}" rx="${Math.max(18, rx/6)}" fill="rgba(255,255,255,0.06)"/>
    <g transform="translate(12,12) scale(1)">
      <svg width="106" height="106" viewBox="0 0 64 64">
        ${iconMark}
      </svg>
    </g>
  </g>

  <!-- Text -->
  <text x="${textX}" y="${brandY}" fill="#F5F7FF"
        font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
        font-size="44" font-weight="${cfg.fontWeight}" letter-spacing="0.2">
    ${escapeXml(brand)}
  </text>
  <text x="${textX}" y="${tagY}" fill="rgba(245,247,255,0.74)"
        font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
        font-size="22" font-weight="600">
    ${escapeXml(tag)}
  </text>

  <!-- Accent line -->
  <rect x="${textX}" y="${tagY + 22}" width="${size - textX - pad}" height="8" rx="4" fill="${cfg.accent}" opacity="0.9"/>
</svg>`.trim();
}

function escapeXml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export default function AdminLogoMakerClient() {
  const [cfg, setCfg] = useState<LogoConfig>({
    brandName: "Prime Tech Services",
    tagline: "Repairs • Software • Managed Releases",
    icon: "chip",
    shape: "rounded",
    primary: "#3B82F6",
    accent: "#F97316",
    background: "#0B1220",
    fontWeight: 800,
    exportSize: 512
  });

  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "err"; msg?: string }>({ kind: "idle" });

  const svg = useMemo(() => buildLogoSvg(cfg), [cfg]);
  const previewSrc = useMemo(() => svgToDataUri(svg), [svg]);

  const exportSize = clampInt(cfg.exportSize, 128, 2048);

  async function onExportSvg() {
    setStatus({ kind: "idle" });
    try {
      downloadBlob(svgToBlob(svg), "app-logo.svg");
      setStatus({ kind: "ok", msg: "SVG exported." });
    } catch (e: any) {
      setStatus({ kind: "err", msg: e?.message ?? "SVG export failed." });
    }
  }

  async function onExportPng() {
    setStatus({ kind: "idle" });
    try {
      const pngBlob = await svgToPngBlob(svg, exportSize, cfg.background);
      downloadBlob(pngBlob, `app-logo-${exportSize}.png`);
      setStatus({ kind: "ok", msg: "PNG exported." });
    } catch (e: any) {
      setStatus({ kind: "err", msg: e?.message ?? "PNG export failed." });
    }
  }

  async function onSaveAsAppLogo() {
    setStatus({ kind: "idle" });
    try {
      const pngBlob = await svgToPngBlob(svg, 512, cfg.background);
      const pngBase64 = await blobToBase64DataUrl(pngBlob);

      const res = await fetch("/api/admin/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pngBase64,
          meta: {
            brandName: cfg.brandName,
            tagline: cfg.tagline,
            icon: cfg.icon,
            shape: cfg.shape,
            primary: cfg.primary,
            accent: cfg.accent,
            background: cfg.background,
            fontWeight: cfg.fontWeight,
            exportSize: 512
          }
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Save failed (${res.status}): ${text}`);
      }

      setStatus({ kind: "ok", msg: "Saved as App Logo. Refresh the site to see it in the header." });
    } catch (e: any) {
      setStatus({ kind: "err", msg: e?.message ?? "Save failed." });
    }
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-lg font-semibold mb-1">Logo Maker</div>
          <div className="text-sm opacity-80 mb-5">
            Create a simple logo for your app. Export as SVG/PNG or save as the app’s global logo.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm">
              <div className="mb-1 opacity-80">Brand name</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
                value={cfg.brandName}
                onChange={(e) => setCfg((p) => ({ ...p, brandName: e.target.value }))}
              />
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Tagline</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
                value={cfg.tagline}
                onChange={(e) => setCfg((p) => ({ ...p, tagline: e.target.value }))}
              />
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Icon</div>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
                value={cfg.icon}
                onChange={(e) => setCfg((p) => ({ ...p, icon: e.target.value as any }))}
              >
                <option value="chip">Chip</option>
                <option value="bolt">Bolt</option>
                <option value="wrench">Wrench</option>
                <option value="shield">Shield</option>
                <option value="globe">Globe</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Shape</div>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
                value={cfg.shape}
                onChange={(e) => setCfg((p) => ({ ...p, shape: e.target.value as any }))}
              >
                <option value="rounded">Rounded</option>
                <option value="square">Square</option>
                <option value="pill">Pill</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Primary</div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={cfg.primary}
                  onChange={(e) => setCfg((p) => ({ ...p, primary: e.target.value }))}
                />
                <input
                  className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
                  value={cfg.primary}
                  onChange={(e) => setCfg((p) => ({ ...p, primary: e.target.value }))}
                />
              </div>
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Accent</div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={cfg.accent}
                  onChange={(e) => setCfg((p) => ({ ...p, accent: e.target.value }))}
                />
                <input
                  className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
                  value={cfg.accent}
                  onChange={(e) => setCfg((p) => ({ ...p, accent: e.target.value }))}
                />
              </div>
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Background</div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={cfg.background}
                  onChange={(e) => setCfg((p) => ({ ...p, background: e.target.value }))}
                />
                <input
                  className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
                  value={cfg.background}
                  onChange={(e) => setCfg((p) => ({ ...p, background: e.target.value }))}
                />
              </div>
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Font weight</div>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
                value={cfg.fontWeight}
                onChange={(e) => setCfg((p) => ({ ...p, fontWeight: Number(e.target.value) as any }))}
              >
                <option value={500}>500</option>
                <option value={600}>600</option>
                <option value={700}>700</option>
                <option value={800}>800</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Export size (px)</div>
              <input
                type="number"
                min={128}
                max={2048}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
                value={cfg.exportSize}
                onChange={(e) => setCfg((p) => ({ ...p, exportSize: Number(e.target.value) }))}
              />
              <div className="text-xs opacity-70 mt-1">PNG export uses this size. Save-as-app-logo uses 512px.</div>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 items-center">
            <button
              className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10"
              onClick={onExportSvg}
              type="button"
            >
              Export SVG
            </button>
            <button
              className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10"
              onClick={onExportPng}
              type="button"
            >
              Export PNG ({exportSize}px)
            </button>
            <button
              className="rounded-xl px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white"
              onClick={onSaveAsAppLogo}
              type="button"
            >
              Save as App Logo
            </button>

            {status.kind !== "idle" && (
              <div
                className={
                  "text-sm px-3 py-2 rounded-xl border " +
                  (status.kind === "ok"
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    : "border-red-400/30 bg-red-500/10 text-red-200")
                }
              >
                {status.msg}
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold mb-3">Preview</div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 flex items-center justify-center">
            <img
              src={previewSrc}
              alt="Logo preview"
              className="w-full max-w-[320px] h-auto"
            />
          </div>

          <div className="mt-4 text-xs opacity-75">
            If the controls do not respond, the page is not hydrated. This file is forced as a client component.
          </div>
        </div>
      </div>
    </div>
  );
}
