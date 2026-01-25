import { Router } from "express";
import * as c from "../controllers/auth.controller";

export const authRoutes = Router();
authRoutes.post("/register", c.register);
authRoutes.post("/login", c.login);
authRoutes.post("/logout", c.logout);
authRoutes.get("/me", c.me);
authRoutes.post("/verify-email", c.verifyEmail);
authRoutes.post("/request-password-reset", c.requestPasswordReset);
authRoutes.post("/reset-password", c.resetPassword);
