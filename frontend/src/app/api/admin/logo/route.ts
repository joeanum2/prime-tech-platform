import { NextResponse } from "next/server";
import { z } from "zod";
import path from "path";
import { promises as fs } from "fs";
import { getSession } from "@/lib/server/session";

const bodySchema = z.object({
  pngBase64: z.string().min(1),
  meta: z.object({
    brandName: z.string().optional(),
    tagline: z.string().optional(),
    colors: z.object({
      primary: z.string().optional(),
      accent: z.string().optional(),
      background: z.string().optional()
    }).optional(),
    updatedAt: z.string().optional()
  })
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { pngBase64, meta } = parsed.data;
  const b64 = pngBase64.includes(",") ? pngBase64.split(",")[1] : pngBase64;

  let buf: Buffer;
  try {
    buf = Buffer.from(b64, "base64");
    if (!buf.length) throw new Error("empty");
  } catch {
    return NextResponse.json({ error: "Invalid base64" }, { status: 400 });
  }

  const brandingDir = path.join(process.cwd(), "public", "branding");
  await fs.mkdir(brandingDir, { recursive: true });

  const pngPath = path.join(brandingDir, "app-logo.png");
  const jsonPath = path.join(brandingDir, "app-logo.json");

  const updatedAt = meta.updatedAt || new Date().toISOString();
  const metaOut = { ...meta, updatedAt };

  await fs.writeFile(pngPath, buf);
  await fs.writeFile(jsonPath, JSON.stringify(metaOut, null, 2), "utf8");

  return NextResponse.json({
    ok: true,
    paths: { png: "/branding/app-logo.png", meta: "/branding/app-logo.json" },
    updatedAt
  });
}
