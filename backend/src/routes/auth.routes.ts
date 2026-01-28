import { Router } from "express";
import { login, logout, me } from "../auth/auth.controller";
import { requireAuth } from "../middlewares/auth";

const authRoutes = Router();

authRoutes.post("/login", login);
authRoutes.post("/logout", requireAuth, logout);
authRoutes.get("/me", requireAuth, me);

export default authRoutes;
