"use client";

import React, { useMemo, useState } from "react";
import { makeLogoSvg } from "@/lib/logoMaker";
import {
  A4_CORPORATE_CLEAN,
  A5_PRIME_TECH_BUSINESS_STANDARD,
  type LogoMakerInput,
  type LogoType
} from "@/lib/logoPresets";

type LogoConfig = {
  brandName: string;
  tagline: string;
  icon: "chip";
  shape: "rounded";
  primary: string;
  accent: string;
  background: string;
  fontWeight: number;
  exportSize: number;
};

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function asColorInputValue(value: string, fallback = "#000000") {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : fallback;
}

function svgToDataUri(svg: string) {
  const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

function svgToBlob(svg: string) {
  return new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
}

async function svgToPngBlob(svg: string, width: number, height: number, background: string) {
  const svgUrl = URL.createObjectURL(svgToBlob(svg));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG for PNG export"));
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context not available");

    if (background && background !== "transparent") {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png");
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function getExportDimensions(logoType: LogoType, exportSize: number) {
  if (logoType === "business") {
    const width = clampInt(exportSize, 400, 2400);
    const height = Math.round((width * 250) / 800);
    return { width, height };
  }
  const size = clampInt(exportSize, 128, 2048);
  return { width: size, height: size };
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

function truncateText(value: string, max = 300) {
  return value.length <= max ? value : `${value.slice(0, max)}...`;
}

export default function AdminLogoMakerClient() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
  const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "";
  const [logoType, setLogoType] = useState<LogoType>(A5_PRIME_TECH_BUSINESS_STANDARD.input.logoType);
  const [cfg, setCfg] = useState<LogoConfig>(A5_PRIME_TECH_BUSINESS_STANDARD.input);
  const [presetId, setPresetId] = useState<"A4" | "A5">("A5");
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "ok" | "err"; msg?: string }>({ kind: "idle" });

  const { width: exportWidth, height: exportHeight } = getExportDimensions(logoType, cfg.exportSize);
  const exportSize = exportWidth;
  const svg = useMemo(() => {
    const input: LogoMakerInput = { ...cfg, logoType, exportSize };
    return makeLogoSvg(input).svg;
  }, [cfg, logoType, exportSize]);
  const previewSrc = useMemo(() => svgToDataUri(svg), [svg]);

  async function onExportSvg() {
    setStatus({ kind: "idle" });
    try {
      downloadBlob(svgToBlob(svg), `app-logo-${logoType}.svg`);
      setStatus({ kind: "ok", msg: "SVG exported." });
    } catch (e: any) {
      setStatus({ kind: "err", msg: e?.message ?? "SVG export failed." });
    }
  }

  async function onExportPng() {
    setStatus({ kind: "idle" });
    try {
      const pngBlob = await svgToPngBlob(svg, exportWidth, exportHeight, cfg.background);
      downloadBlob(pngBlob, `app-logo-${logoType}-${exportWidth}x${exportHeight}.png`);
      setStatus({ kind: "ok", msg: "PNG exported." });
    } catch (e: any) {
      setStatus({ kind: "err", msg: e?.message ?? "PNG export failed." });
    }
  }

  async function onSaveAsAppLogo() {
    setStatus({ kind: "saving", msg: "Saving..." });
    try {
      const saveDims = logoType === "business" ? { width: 800, height: 250 } : { width: 512, height: 512 };
      const pngBlob = await svgToPngBlob(svg, saveDims.width, saveDims.height, cfg.background);
      const pngBase64 = await blobToBase64DataUrl(pngBlob);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken) {
        headers.Authorization = `Bearer ${adminToken}`;
      }

      const res = await fetch(`${apiBase}/api/admin/branding/logo`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          pngBase64,
          svgText: svg,
          meta: {
            brandName: cfg.brandName,
            tagline: cfg.tagline,
            colors: {
              primary: cfg.primary,
              accent: cfg.accent,
              background: cfg.background
            },
            updatedAt: new Date().toISOString()
          }
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Save failed\napiBase: ${apiBase}\nstatus: ${res.status}\nresponse: ${truncateText(text || "(empty)")}`
        );
      }
      setStatus({ kind: "ok", msg: "Saved." });
    } catch (e: any) {
      setStatus({
        kind: "err",
        msg:
          e?.message ??
          `Save failed\napiBase: ${apiBase}\nstatus: n/a\nresponse: request failed`
      });
    }
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-2">
          <div className="mb-1 text-lg font-semibold">Logo Maker</div>
          <div className="mb-5 text-sm opacity-80">Create, export, and save your app logo.</div>

          <div className="mb-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
            Preset:
            <select
              className="ml-2 rounded border border-white/10 bg-transparent px-2 py-1"
              value={presetId}
              onChange={(e) => {
                const next = e.target.value as "A4" | "A5";
                setPresetId(next);
                const preset = next === "A5" ? A5_PRIME_TECH_BUSINESS_STANDARD : A4_CORPORATE_CLEAN;
                setLogoType(preset.input.logoType);
                setCfg(preset.input);
              }}
            >
              <option value="A4">{A4_CORPORATE_CLEAN.name}</option>
              <option value="A5">{A5_PRIME_TECH_BUSINESS_STANDARD.name}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm">
              <div className="mb-1 opacity-80">Logo type</div>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
                value={logoType}
                onChange={(e) => {
                  const nextType = e.target.value as LogoType;
                  setLogoType(nextType);
                  setCfg((prev) => {
                    if (nextType === "business") {
                      return {
                        ...prev,
                        brandName: "Prime Tech Services",
                        tagline: "Repairs • Software • Support",
                        fontWeight: 800,
                        exportSize: 800
                      };
                    }
                    return prev;
                  });
                }}
              >
                <option value="app">App</option>
                <option value="full">Full</option>
                <option value="business">Business Logo</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Icon</div>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
                value={cfg.icon}
                onChange={(e) => setCfg((p) => ({ ...p, icon: e.target.value as "chip" }))}
              >
                <option value="chip">Chip</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Brand name</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none disabled:opacity-50"
                value={cfg.brandName}
                onChange={(e) => setCfg((p) => ({ ...p, brandName: e.target.value }))}
              />
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Tagline</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none disabled:opacity-50"
                value={cfg.tagline}
                onChange={(e) => setCfg((p) => ({ ...p, tagline: e.target.value }))}
              />
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Shape</div>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
                value={cfg.shape}
                onChange={(e) => setCfg((p) => ({ ...p, shape: e.target.value as "rounded" }))}
              >
                <option value="rounded">Rounded</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Primary</div>
              <div className="flex items-center gap-3">
                <input type="color" value={cfg.primary} onChange={(e) => setCfg((p) => ({ ...p, primary: e.target.value }))} />
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
                <input type="color" value={cfg.accent} onChange={(e) => setCfg((p) => ({ ...p, accent: e.target.value }))} />
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
                  value={asColorInputValue(cfg.background, "#f5f7fb")}
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
                onChange={(e) => setCfg((p) => ({ ...p, fontWeight: Number(e.target.value) as LogoConfig["fontWeight"] }))}
              >
                <option value={400}>400</option>
                <option value={500}>500</option>
                <option value={600}>600</option>
                <option value={700}>700</option>
                <option value={800}>800</option>
                <option value={900}>900</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Export size (px)</div>
              <input
                type="number"
                min={128}
                max={2400}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
                value={cfg.exportSize}
                onChange={(e) => setCfg((p) => ({ ...p, exportSize: Number(e.target.value) }))}
              />
              {logoType === "business" ? (
                <div className="mt-1 text-xs opacity-70">Business export ratio is fixed at 800:250.</div>
              ) : null}
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/15" onClick={onExportSvg} type="button">
              Export SVG
            </button>
            <button className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/15" onClick={onExportPng} type="button">
              Export PNG ({exportWidth}x{exportHeight})
            </button>
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-60"
              onClick={onSaveAsAppLogo}
              type="button"
              disabled={status.kind === "saving"}
            >
              {status.kind === "saving" ? "Saving..." : "Save as App Logo"}
            </button>
            {status.kind !== "idle" ? (
              <div
                className={
                  "rounded-xl border px-3 py-2 text-sm " +
                  (status.kind === "ok"
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    : status.kind === "saving"
                      ? "border-blue-400/30 bg-blue-500/10 text-blue-100"
                      : "border-red-400/30 bg-red-500/10 text-red-200")
                }
              >
                <span className="whitespace-pre-wrap">{status.msg}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-3 text-sm font-semibold">Preview</div>
          <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/30 p-4">
            <img src={previewSrc} alt="Logo preview" className="h-auto w-full max-w-[320px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
