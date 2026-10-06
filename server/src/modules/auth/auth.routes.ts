import express from "express";
import { csrf, login, logout, refresh, resendTwoFactor, verifyTwoFactor } from "./auth.controller";
import { asyncHandler, isToken } from "./auth.middleware"
import { validateSchema } from "../../common/validation/validate-schema.middleware";
import { loginSchema, twoFactorVerifySchema } from "./auth.schema";
import { loginRateLimit } from "./auth.login-rate-limit.middleware";
import { twoFactorRateLimit } from "./auth.two-factor-rate-limit.middleware";
import telegramRouter from "./telegram/auth.telegram.routes";
import { getAuthProviders } from "./telegram/auth.telegram.controller";

const router = express.Router();

router.post("/login", loginRateLimit, validateSchema(loginSchema), asyncHandler(login));
router.post("/login/2fa/verify", twoFactorRateLimit, validateSchema(twoFactorVerifySchema), asyncHandler(verifyTwoFactor));
router.post("/login/2fa/resend", twoFactorRateLimit, asyncHandler(resendTwoFactor));
router.get("/csrf", asyncHandler(isToken), asyncHandler(csrf));
router.post("/logout", asyncHandler(logout));
router.post('/refresh', asyncHandler(refresh));
router.get("/providers", asyncHandler(getAuthProviders));
router.use("/telegram", telegramRouter);

export default router
