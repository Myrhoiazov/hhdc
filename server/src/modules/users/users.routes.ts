import express from "express";
import { linkTelegramMiniAppController, createUserController, deleteUserByIdController, gettAllUsersController, getUserByIdController, updateUserController } from "./users.controller";
import { asyncHandler, isToken, requireOwnerOrRole, requireRole } from "../auth/auth.middleware";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.get("/", asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(gettAllUsersController));
router.post("/", asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(createUserController));
router.get("/:id", asyncHandler(isToken), requireOwnerOrRole(UserRole.ADMIN), asyncHandler(getUserByIdController));
router.delete("/:id", asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(deleteUserByIdController));
router.patch("/:id", asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(updateUserController));

router.post('/:id/telegram-miniapp-link', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(linkTelegramMiniAppController));

export default router;
