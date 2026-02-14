import type { LogoMakerInput } from "./logoPresets";

type RenderResult = { svg: string };

function esc(s: string) {
  return (s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function chipGlyph(cx: number, cy: number, size: number, color: string) {
  const s = size;
  const r = Math.round(s * 0.16);
  const core = `
    <rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" rx="${r}" fill="${color}" opacity="0.98"/>
    <rect x="${cx - s * 0.26}" y="${cy - s * 0.26}" width="${s * 0.52}" height="${s * 0.52}" rx="${Math.round(r * 0.65)}" fill="white" opacity="0.20"/>
  `;

  const pinLen = s * 0.18;
  const pinGap = s * 0.18;
  const pinW = Math.max(2, Math.round(s * 0.08));
  const pins: string[] = [];

  const topY = cy - s / 2 - pinLen + 2;
  const botY = cy + s / 2 - 2;
  const leftX = cx - s / 2 - pinLen + 2;
  const rightX = cx + s / 2 - 2;

  const offsets = [-pinGap, 0, pinGap];

  for (const dx of offsets) {
    pins.push(`<rect x="${cx + dx - pinW / 2}" y="${topY}" width="${pinW}" height="${pinLen}" rx="${pinW / 2}" fill="${color}" opacity="0.92"/>`);
    pins.push(`<rect x="${cx + dx - pinW / 2}" y="${botY}" width="${pinW}" height="${pinLen}" rx="${pinW / 2}" fill="${color}" opacity="0.92"/>`);
  }
  for (const dy of offsets) {
    pins.push(`<rect x="${leftX}" y="${cy + dy - pinW / 2}" width="${pinLen}" height="${pinW}" rx="${pinW / 2}" fill="${color}" opacity="0.92"/>`);
    pins.push(`<rect x="${rightX}" y="${cy + dy - pinW / 2}" width="${pinLen}" height="${pinW}" rx="${pinW / 2}" fill="${color}" opacity="0.92"/>`);
  }

  return `<g>${pins.join("")}${core}</g>`;
}

function appIconSvg(input: LogoMakerInput): string {
  const size = input.exportSize || 512;
  const bg = input.background;
  const primary = input.primary;
  const navy = input.accent;

  const pad = Math.round(size * 0.09);
  const radius = Math.round(size * 0.2);

  const chipCx = Math.round(size * 0.5);
  const chipCy = Math.round(size * 0.34);
  const chipSize = Math.round(size * 0.18);

  const textY = Math.round(size * 0.7);
  const textSize = Math.round(size * 0.22);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${Math.round(size * 0.012)}" stdDeviation="${Math.round(size * 0.018)}" flood-color="#0B1F3B" flood-opacity="0.18"/>
    </filter>
  </defs>

  <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}"
        rx="${radius}" fill="${bg}" filter="url(#softShadow)"/>

  ${chipGlyph(chipCx, chipCy, chipSize, primary)}

  <text x="50%" y="${textY}" text-anchor="middle"
        font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
        font-size="${textSize}" font-weight="${input.fontWeight || 800}"
        letter-spacing="${Math.round(-size * 0.008)}"
        fill="${navy}">PT</text>

  <rect x="${Math.round(size * 0.33)}" y="${Math.round(size * 0.78)}"
        width="${Math.round(size * 0.34)}" height="${Math.max(6, Math.round(size * 0.012))}"
        rx="${Math.max(4, Math.round(size * 0.01))}" fill="${primary}" opacity="0.85"/>
</svg>
  `.trim();
}

function businessLogoSvg(input: LogoMakerInput): string {
  const width = input.exportSize || 800;
  const height = Math.round((width * 250) / 800);
  const bg = input.background;
  const primary = input.primary;
  const accent = input.accent;
  const brand = esc(input.brandName || "Prime Tech Services");
  const tagline = esc(input.tagline || "Repairs • Software • Support");

  const padX = Math.round(width * 0.05);
  const padY = Math.round(height * 0.16);
  const iconSize = Math.round(height * 0.56);
  const iconCx = padX + Math.round(iconSize * 0.5);
  const iconCy = Math.round(height * 0.5);

  const textX = padX + iconSize + Math.round(width * 0.04);
  const availableW = width - textX - padX;
  const brandSizeFromWidth = Math.floor((availableW / Math.max(brand.length, 10)) * 1.9);
  const brandSize = Math.max(34, Math.min(Math.round(height * 0.28), brandSizeFromWidth));
  const tagSizeFromWidth = Math.floor((availableW / Math.max(tagline.length, 10)) * 1.55);
  const tagSize = Math.max(16, Math.min(Math.round(height * 0.11), tagSizeFromWidth));

  const brandY = Math.round(height * 0.48);
  const tagY = brandY + Math.round(height * 0.2);
  const cardRadius = Math.round(height * 0.18);
  const cardFill = bg === "transparent" ? "none" : bg;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="softShadowBiz" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${Math.max(2, Math.round(height * 0.02))}" stdDeviation="${Math.max(2, Math.round(height * 0.03))}" flood-color="#0B1F3B" flood-opacity="0.14"/>
    </filter>
  </defs>

  <rect x="${padX}" y="${padY}" width="${width - padX * 2}" height="${height - padY * 2}"
        rx="${cardRadius}" fill="${cardFill}" filter="url(#softShadowBiz)"/>

  ${chipGlyph(iconCx, iconCy, iconSize * 0.52, primary)}

  <text x="${textX}" y="${brandY}"
        font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
        font-size="${brandSize}" font-weight="800" fill="${accent}">${brand}</text>

  <text x="${textX}" y="${tagY}"
        font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
        font-size="${tagSize}" font-weight="600" fill="${accent}" opacity="0.68">${tagline}</text>
</svg>
  `.trim();
}

function fullLogoSvg(input: LogoMakerInput): string {
  const size = input.exportSize || 512;
  const bg = input.background;
  const primary = input.primary;
  const accent = input.accent;
  const brand = esc(input.brandName || "Prime Tech Services");
  const tagline = esc(input.tagline || "");

  const pad = Math.round(size * 0.09);
  const radius = Math.round(size * 0.2);

  const chipCx = Math.round(size * 0.22);
  const chipCy = Math.round(size * 0.34);
  const chipSize = Math.round(size * 0.16);

  const brandX = Math.round(size * 0.36);
  const brandY = Math.round(size * 0.36);
  const brandSize = Math.round(size * 0.1);

  const tagY = Math.round(size * 0.48);
  const tagSize = Math.round(size * 0.045);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${Math.round(size * 0.012)}" stdDeviation="${Math.round(size * 0.018)}" flood-color="#0B1F3B" flood-opacity="0.18"/>
    </filter>
  </defs>

  <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}"
        rx="${radius}" fill="${bg}" filter="url(#softShadow)"/>

  ${chipGlyph(chipCx, chipCy, chipSize, primary)}

  <text x="${brandX}" y="${brandY}"
        font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
        font-size="${brandSize}" font-weight="${input.fontWeight || 800}"
        fill="${accent}">${brand}</text>

  ${tagline ? `<text x="${brandX}" y="${tagY}"
        font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
        font-size="${tagSize}" font-weight="600"
        fill="${accent}" opacity="0.78">${tagline}</text>` : ""}

  <rect x="${brandX}" y="${Math.round(size * 0.56)}"
        width="${Math.round(size * 0.52)}" height="${Math.max(6, Math.round(size * 0.012))}"
        rx="${Math.max(4, Math.round(size * 0.01))}" fill="${primary}" opacity="0.85"/>
</svg>
  `.trim();
}

export function makeLogoSvg(input: LogoMakerInput): RenderResult {
  const svg =
    input.logoType === "business"
      ? businessLogoSvg(input)
      : input.logoType === "full"
        ? fullLogoSvg(input)
        : appIconSvg(input);
  return { svg };
}
