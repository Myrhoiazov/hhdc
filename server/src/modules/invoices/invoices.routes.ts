import express from 'express';
import { asyncHandler, isToken } from '../auth/auth.middleware';
import {
    confirmPaidInvoice,
    createInvoice,
    createPaidInvoice,
    createInvoiceAdjustment,
    createInvoicePaymentLink,
    downloadPublicInvoicePdf,
    downloadInvoicePdf,
    getInvoiceDeliveries,
    getInvoiceHistory,
    getInvoices,
    recordInvoicePayment,
    sendInvoice,
    syncOverdueInvoices,
    updateInvoice,
    updateInvoiceStatus,
    viewPublicInvoice,
} from './invoices.controller';

const router = express.Router();

router.get('/', asyncHandler(isToken), asyncHandler(getInvoices));
router.post('/sync-overdue', asyncHandler(isToken), asyncHandler(syncOverdueInvoices));
router.get('/public/:token', asyncHandler(viewPublicInvoice));
router.get('/public/:token/pdf', asyncHandler(downloadPublicInvoicePdf));
router.post('/', asyncHandler(isToken), asyncHandler(createInvoice));
router.post('/paid', asyncHandler(isToken), asyncHandler(createPaidInvoice));
router.put('/:id', asyncHandler(isToken), asyncHandler(updateInvoice));
router.post('/:id/confirm-paid', asyncHandler(isToken), asyncHandler(confirmPaidInvoice));
router.patch('/:id/status', asyncHandler(isToken), asyncHandler(updateInvoiceStatus));
router.post('/:id/payments', asyncHandler(isToken), asyncHandler(recordInvoicePayment));
router.post('/:id/mollie-payment-link', asyncHandler(isToken), asyncHandler(createInvoicePaymentLink));
router.post('/:id/send', asyncHandler(isToken), asyncHandler(sendInvoice));
router.get('/:id/deliveries', asyncHandler(isToken), asyncHandler(getInvoiceDeliveries));
router.post('/:id/adjustments', asyncHandler(isToken), asyncHandler(createInvoiceAdjustment));
router.get('/:id/history', asyncHandler(isToken), asyncHandler(getInvoiceHistory));
router.get('/:id/pdf', asyncHandler(isToken), asyncHandler(downloadInvoicePdf));

export default router;
