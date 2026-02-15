import type { Request, Response } from "express";
import path from "path";
import { promises as fs } from "fs";

type BrandingLogoPayload = {
  pngBase64?: unknown;
  svgText?: unknown;
  meta?: unknown;
};

function extractPngBase64(input: string) {
  const trimmed = input.trim();
  const match = /^data:image\/png;base64,(.+)$/i.exec(trimmed);
  return (match ? match[1] : trimmed).replace(/\s+/g, "");
}

export async function adminSaveBrandingLogo(req: Request, res: Response) {
  const body = (req.body ?? {}) as BrandingLogoPayload;
  if (typeof body.pngBase64 !== "string" || body.pngBase64.trim().length === 0) {
    return res.status(400).json({ error: "pngBase64 is required" });
  }

  const pngRaw = extractPngBase64(body.pngBase64);
  let pngBuffer: Buffer;
  try {
    pngBuffer = Buffer.from(pngRaw, "base64");
  } catch {
    return res.status(400).json({ error: "pngBase64 is not valid base64" });
  }
  if (!pngBuffer.length) {
    return res.status(400).json({ error: "pngBase64 decoded to an empty file" });
  }

  const brandingDir = path.join(__dirname, "..", "..", "public", "branding");
  await fs.mkdir(brandingDir, { recursive: true });

  const pngPath = path.join(brandingDir, "logo.png");
  const svgPath = path.join(brandingDir, "logo.svg");
  const metaPath = path.join(brandingDir, "app-logo.json");

  await fs.writeFile(pngPath, pngBuffer);
  if (typeof body.svgText === "string" && body.svgText.trim().length > 0) {
    await fs.writeFile(svgPath, body.svgText, "utf8");
  }

  const meta =
    body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
      ? body.meta
      : {};
  await fs.writeFile(
    metaPath,
    JSON.stringify(
      {
        ...meta,
        savedAt: new Date().toISOString()
      },
      null,
      2
    ),
    "utf8"
  );

  return res.json({
    ok: true,
    pngUrl: "/branding/logo.png",
    svgUrl: "/branding/logo.svg"
  });
}
