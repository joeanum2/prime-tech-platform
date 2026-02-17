"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type IconType = "chip" | "wrench" | "shield" | "bolt";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function blobToBase64DataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Failed to convert blob to base64"));
    r.readAsDataURL(blob);
  });
}

function truncateText(value: string, max = 300) {
  return value.length <= max ? value : `${value.slice(0, max)}...`;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function idealTextColor(bgHex: string) {
  const { r, g, b } = hexToRgb(bgHex);
  // Relative luminance-ish
  const y = (r * 299 + g * 587 + b * 114) / 1000;
  return y >= 160 ? "#0b0b0b" : "#ffffff";
}

function drawIcon(ctx: CanvasRenderingContext2D, icon: IconType, x: number, y: number, size: number, fg: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = fg;
  ctx.fillStyle = fg;
  ctx.lineWidth = Math.max(2, Math.floor(size * 0.06));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const s = size;

  if (icon === "chip") {
    // Chip outline
    const r = s * 0.18;
    const w = s * 0.72;
    const h = s * 0.72;
    const ox = -w / 2;
    const oy = -h / 2;

    // Rounded rect
    ctx.beginPath();
    ctx.moveTo(ox + r, oy);
    ctx.arcTo(ox + w, oy, ox + w, oy + h, r);
    ctx.arcTo(ox + w, oy + h, ox, oy + h, r);
    ctx.arcTo(ox, oy + h, ox, oy, r);
    ctx.arcTo(ox, oy, ox + w, oy, r);
    ctx.closePath();
    ctx.stroke();

    // Inner lines
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(-s * 0.18, -s * 0.10);
    ctx.lineTo(s * 0.18, -s * 0.10);
    ctx.moveTo(-s * 0.18, s * 0.10);
    ctx.lineTo(s * 0.18, s * 0.10);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Pins
    ctx.globalAlpha = 0.9;
    const pinLen = s * 0.12;
    const pinGap = s * 0.16;
    for (let i = -2; i <= 2; i++) {
      const py = i * pinGap;
      ctx.beginPath();
      ctx.moveTo(ox - pinLen, py);
      ctx.lineTo(ox, py);
      ctx.moveTo(ox + w, py);
      ctx.lineTo(ox + w + pinLen, py);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * pinGap, oy - pinLen);
      ctx.lineTo(i * pinGap, oy);
      ctx.moveTo(i * pinGap, oy + h);
      ctx.lineTo(i * pinGap, oy + h + pinLen);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if (icon === "wrench") {
    // Simple wrench silhouette
    const lw = Math.max(3, Math.floor(s * 0.08));
    ctx.lineWidth = lw;

    // Handle
    ctx.beginPath();
    ctx.moveTo(-s * 0.22, s * 0.20);
    ctx.lineTo(s * 0.22, -s * 0.24);
    ctx.stroke();

    // Jaw
    ctx.beginPath();
    ctx.arc(s * 0.28, -s * 0.30, s * 0.16, Math.PI * 0.15, Math.PI * 1.15);
    ctx.stroke();

    // Hole at base
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(-s * 0.28, s * 0.28, s * 0.08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (icon === "shield") {
    // Shield outline
    const lw = Math.max(3, Math.floor(s * 0.06));
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.34);
    ctx.lineTo(s * 0.28, -s * 0.22);
    ctx.lineTo(s * 0.24, s * 0.10);
    ctx.quadraticCurveTo(0, s * 0.36, -s * 0.24, s * 0.10);
    ctx.lineTo(-s * 0.28, -s * 0.22);
    ctx.closePath();
    ctx.stroke();

    // Check mark
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = Math.max(3, Math.floor(s * 0.07));
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.02);
    ctx.lineTo(-s * 0.02, s * 0.12);
    ctx.lineTo(s * 0.16, -s * 0.06);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (icon === "bolt") {
    // Lightning bolt
    ctx.beginPath();
    ctx.moveTo(-s * 0.06, -s * 0.34);
    ctx.lineTo(s * 0.10, -s * 0.08);
    ctx.lineTo(-s * 0.02, -s * 0.08);
    ctx.lineTo(s * 0.06, s * 0.34);
    ctx.lineTo(-s * 0.12, s * 0.06);
    ctx.lineTo(0, s * 0.06);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function renderLogo(
  canvas: HTMLCanvasElement,
  opts: {
    width: number;
    height: number;
    bg: string;
    accent: string;
    text: string;
    tagline: string;
    icon: IconType;
    rounded: number;
  }
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height, bg, accent, text, tagline, icon, rounded } = opts;
  canvas.width = width;
  canvas.height = height;

  // Background
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = bg;
  ctx.beginPath();
  const r = clamp(rounded, 0, 64);
  if (r > 0) {
    // rounded rect
    ctx.moveTo(r, 0);
    ctx.arcTo(width, 0, width, height, r);
    ctx.arcTo(width, height, 0, height, r);
    ctx.arcTo(0, height, 0, 0, r);
    ctx.arcTo(0, 0, width, 0, r);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, width, height);
  }

  const fg = idealTextColor(bg);

  // Icon badge
  const badgeSize = Math.floor(height * 0.58);
  const bx = Math.floor(width * 0.16);
  const by = Math.floor(height * 0.50);

  // Badge background
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(bx, by, badgeSize * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Icon
  drawIcon(ctx, icon, bx, by, badgeSize * 0.58, idealTextColor(accent));

  // Text
  ctx.fillStyle = fg;
  ctx.textBaseline = "middle";

  const titleX = Math.floor(width * 0.30);
  const titleY = Math.floor(height * 0.44);

  // Title
  ctx.font = `700 ${Math.floor(height * 0.16)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.fillText(text, titleX, titleY);

  // Tagline
  ctx.globalAlpha = 0.92;
  ctx.font = `500 ${Math.floor(height * 0.09)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.fillText(tagline, titleX, Math.floor(height * 0.66));
  ctx.globalAlpha = 1;

  // Accent underline
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(3, Math.floor(height * 0.02));
  ctx.beginPath();
  ctx.moveTo(titleX, Math.floor(height * 0.78));
  ctx.lineTo(Math.floor(width * 0.92), Math.floor(height * 0.78));
  ctx.stroke();
}

export default function LogoMakerPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
  const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [brandText, setBrandText] = useState("Prime Tech Services");
  const [tagline, setTagline] = useState("Professional Repairs • Software • Support");
  const [bg, setBg] = useState("#111827"); // slate-ish
  const [accent, setAccent] = useState("#22c55e"); // green
  const [icon, setIcon] = useState<IconType>("chip");
  const [rounded, setRounded] = useState(28);
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "ok" | "err"; msg?: string }>({ kind: "idle" });

  const size = useMemo(() => ({ w: 1200, h: 400 }), []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    renderLogo(c, {
      width: size.w,
      height: size.h,
      bg,
      accent,
      text: brandText,
      tagline,
      icon,
      rounded
    });
  }, [brandText, tagline, bg, accent, icon, rounded, size]);

  async function exportPng() {
    const c = canvasRef.current;
    if (!c) return;
    const blob: Blob | null = await new Promise((resolve) => c.toBlob(resolve, "image/png"));
    if (!blob) return;
    downloadBlob(blob, "prime-tech-logo.png");
  }

  async function onSaveAsAppLogo() {
    setStatus({ kind: "saving", msg: "Saving..." });
    try {
      const c = canvasRef.current;
      if (!c) throw new Error("Canvas is not ready");
      const blob: Blob | null = await new Promise((resolve) => c.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Unable to render PNG");
      const pngBase64 = await blobToBase64DataUrl(blob);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken) {
        headers.Authorization = `Bearer ${adminToken}`;
      }
      const res = await fetch(`${apiBase}/api/admin/branding/logo`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          pngBase64,
          meta: {
            brandName: brandText,
            tagline,
            colors: { background: bg, accent },
            icon,
            rounded
          }
        })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Save failed\napiBase: ${apiBase}\nstatus: ${res.status}\nresponse: ${truncateText(text || "(empty)")}`
        );
      }
      setStatus({ kind: "ok", msg: "Saved as app logo." });
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
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight">Logo Maker</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Create a simple brand logo and export as PNG. This page is public: <span className="font-mono">/tools/logo-maker</span>
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
          <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-neutral-800">Preview</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportPng}
                  className="rounded-xl border border-neutral-200 bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  Export PNG
                </button>
                <button
                  onClick={onSaveAsAppLogo}
                  disabled={status.kind === "saving"}
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
                >
                  {status.kind === "saving" ? "Saving..." : "Save as App Logo"}
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <canvas ref={canvasRef} className="h-auto w-full" />
            </div>

            <div className="mt-3 text-xs text-neutral-500">
              Tip: Save as App Logo writes to backend branding files and serves the result from{" "}
              <span className="font-mono">http://localhost:4000/branding/logo.png</span>.
            </div>
            {status.kind !== "idle" ? (
              <div
                className={[
                  "mt-3 rounded-xl border px-3 py-2 text-sm whitespace-pre-wrap",
                  status.kind === "ok"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : status.kind === "saving"
                      ? "border-blue-200 bg-blue-50 text-blue-800"
                      : "border-red-200 bg-red-50 text-red-800"
                ].join(" ")}
              >
                {status.msg}
              </div>
            ) : null}
          </section>

          <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-neutral-800">Settings</div>

            <label className="mt-4 block text-xs font-medium text-neutral-600">Brand name</label>
            <input
              value={brandText}
              onChange={(e) => setBrandText(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
            />

            <label className="mt-4 block text-xs font-medium text-neutral-600">Tagline</label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600">Background</label>
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="mt-1 h-10 w-full cursor-pointer rounded-xl border border-neutral-200 bg-white p-1"
                />
                <div className="mt-1 text-xs text-neutral-500 font-mono">{bg}</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600">Accent</label>
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="mt-1 h-10 w-full cursor-pointer rounded-xl border border-neutral-200 bg-white p-1"
                />
                <div className="mt-1 text-xs text-neutral-500 font-mono">{accent}</div>
              </div>
            </div>

            <label className="mt-5 block text-xs font-medium text-neutral-600">Icon</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["chip", "wrench", "shield", "bolt"] as IconType[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setIcon(k)}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-medium",
                    icon === k ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                  ].join(" ")}
                >
                  {k}
                </button>
              ))}
            </div>

            <label className="mt-5 block text-xs font-medium text-neutral-600">Corner radius</label>
            <input
              type="range"
              min={0}
              max={64}
              value={rounded}
              onChange={(e) => setRounded(parseInt(e.target.value, 10))}
              className="mt-2 w-full"
            />
            <div className="text-xs text-neutral-500">{rounded}px</div>

            <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
              <div className="font-medium text-neutral-800">Repo save</div>
              <div className="mt-1">
                Save action persists files to <span className="font-mono">backend/public/branding/</span> as{" "}
                <span className="font-mono">logo.png</span>, optional <span className="font-mono">logo.svg</span>, and{" "}
                <span className="font-mono">app-logo.json</span>.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
