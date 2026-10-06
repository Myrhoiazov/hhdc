import express from "express";
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getClientCountController, createClientsController, deleteClientByIdController, fetchAllClientsController, getClientByIdController, getClientPaymentSummaryController, updateClientByIdController } from "./clients.controller";
import { asyncHandler, isToken } from "../auth/auth.middleware";
import { ROOT_DIR } from "../../common/utils/paths";

const publicPath = path.resolve(ROOT_DIR, 'public/upload');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, publicPath);
    },
    filename: function (req, file, cb) {
        cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    },
});

const router = express.Router();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only images allowed'));
    },
});

router.get("/", asyncHandler(isToken), asyncHandler(fetchAllClientsController));
router.get("/:id/payment-summary", asyncHandler(isToken), asyncHandler(getClientPaymentSummaryController));
router.get("/count", asyncHandler(isToken), asyncHandler(getClientCountController));
router.get("/:id", asyncHandler(isToken), asyncHandler(getClientByIdController));
router.delete("/:id", asyncHandler(isToken), asyncHandler(deleteClientByIdController));
router.put("/:id", asyncHandler(isToken), upload.single('image'), asyncHandler(updateClientByIdController));
router.post("/", asyncHandler(isToken), upload.single('image'), asyncHandler(createClientsController));

export default router;
