import type { Request, Response } from "express";
import { notImplemented } from "./_common.controller";

export function register(req: Request, res: Response) { return notImplemented(req, res); }
export function login(req: Request, res: Response) { return notImplemented(req, res); }
export function verifyEmail(req: Request, res: Response) { return notImplemented(req, res); }
export function requestPasswordReset(req: Request, res: Response) { return notImplemented(req, res); }
export function resetPassword(req: Request, res: Response) { return notImplemented(req, res); }

export function me(_req: Request, res: Response) {
  return res.status(200).json({ user: null });
}

export function logout(_req: Request, res: Response) {
  return res.status(204).send();
}
