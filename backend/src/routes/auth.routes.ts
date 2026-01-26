import { Router } from "express";
import { login, logout, me } from "../auth/auth.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/login", login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);

export default router;
