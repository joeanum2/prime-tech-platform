import type { Request, Response } from "express";
import { AppError } from "../domain/errors";

export function notImplemented(_req: Request, _res: Response): never {
  throw new AppError("NOT_IMPLEMENTED", "Not implemented yet.", 501);
}
