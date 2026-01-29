import type { Request, Response } from "express";
import { getAdminStats } from "../domain";
import { prisma } from "../db/prisma";

export async function adminStats(_req: Request, res: Response) {
  const data = await getAdminStats(prisma);
  return res.json(data);
}
