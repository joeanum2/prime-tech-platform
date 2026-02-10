import type { Request, Response } from "express";
import { serviceCatalog } from "../data.services";

export function listServices(_req: Request, res: Response) {
  return res.json(serviceCatalog);
}
