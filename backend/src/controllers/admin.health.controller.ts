import type { Request, Response } from "express";

export function adminHealth(_req: Request, res: Response) {
  return res.json({ ok: true, scope: "admin", ts: new Date().toISOString() });
}
