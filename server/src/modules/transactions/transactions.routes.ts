import express from "express";
import { asyncHandler, isToken } from "../auth/auth.middleware"
import { createTransactionController, deleteTransactionByIdController, exportMonthlyRevenueController, fetchAllTransactionsController, getTransactionChartController, getTransactionSummaryController } from "./transactions.controller";

const router = express.Router();

router.use(asyncHandler(isToken));

router.get("/", asyncHandler(fetchAllTransactionsController));
router.get('/summary', asyncHandler(getTransactionSummaryController));
router.get('/chart', asyncHandler(getTransactionChartController));
router.get('/revenue/export.csv', asyncHandler(exportMonthlyRevenueController));
router.post("/", asyncHandler(createTransactionController));
router.delete("/:id", asyncHandler(deleteTransactionByIdController));

export default router
