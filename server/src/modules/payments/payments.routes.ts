import express from "express";
import { asyncHandler, isAuthenticated } from "../auth/auth.middleware";
import * as mollieController from "./payments.controller";

const router = express.Router();

router.get("/connect", asyncHandler(isAuthenticated), asyncHandler(mollieController.connectMollieController));
router.get("/callback", asyncHandler(mollieController.mollieCallbackController));
router.get("/connection/status", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieConnectionStatusController));
router.post("/telegram/test", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieTelegramTestController));
router.post("/connection/disconnect", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieDisconnectController));
router.get("/organizations", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieGetOrganizationsController));
router.get("/dashboard/summary", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieDashboardSummaryController));

router.post("/sync", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieSyncAllController));
router.post("/sync/customers", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieSyncCustomersController));
router.post("/sync/payments", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieSyncPaymentsController));
router.post("/sync/mandates", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieSyncMandatesController));
router.post("/sync/subscriptions", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieSyncSubscriptionsController));

router.get("/incidents", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieGetPaymentIncidentsController));
router.post("/incidents/:incidentKey/resolve", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieResolveIncidentController));
router.get("/payments", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieGetPaymentsController));
router.get("/payments/matrix", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieGetPaymentsMatrixController));
router.get("/payments/export.csv", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieExportPaymentsController));
router.get("/payments/:paymentId/invoice.pdf", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieDownloadPaymentInvoiceController));
router.post("/payments/:paymentId/cancel", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieCancelPaymentController));
// router.get('/payments/:id', asyncHandler(mollieController.getPaymentById));

router.get("/customers", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieGetCustomersController));
router.get("/customers/active-subscriptions/export.csv", asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieExportActiveSubscriptionsController));
router.get('/customers/edit-data/:customerId', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieGetCustomerEditData));
router.get('/customers/:customerId', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieGetCustomerFullInfo));
router.put('/customers/:customerId', asyncHandler(isAuthenticated), asyncHandler(mollieController.updateCustomerController));
router.delete('/customers/:customerId', asyncHandler(isAuthenticated), asyncHandler(mollieController.deleteCustomerController));
router.post('/customers', asyncHandler(isAuthenticated), asyncHandler(mollieController.createCustomerController));
router.post('/customers/:customerId/payment-link', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieCreateCustomerPaymentLinkController));
router.post('/customers/:customerId/student-links', asyncHandler(isAuthenticated), asyncHandler(mollieController.createCustomerStudentLinkController));
router.get('/customers/:customerId/student-links', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieGetCustomerStudentLinksController));
router.delete('/customers/:customerId/student-links/:linkId', asyncHandler(isAuthenticated), asyncHandler(mollieController.deleteCustomerStudentLinkController));
router.get('/customers/:customerId/payments', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieGetCustomerPaymentsController));

router.get('/customers/:customerId/mandates', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieGetMandatesController));
router.get('/customers/:customerId/mandates/:mandateId', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieGetMandateByIdController));
router.delete('/customers/:customerId/mandates/:mandateId', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieRevokeMandateController));
router.post('/mandates', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieCreateMandateController));
router.post('/mandates/:customerId/subscriptions', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieCreateMandateSubscriptionController));
router.get('/customers/:customerId/subscriptions', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieGetAllSubscriptionByCustomerIdController));
router.get('/mandates/:customerId', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieGetMandatesController));


router.delete('/subscriptions/:subscriptionId', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieDeleteSubscriptionByIdController));
router.patch('/subscriptions/:subscriptionId', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieUpdateSubscriptionController));
router.post('/subscriptions/:subscriptionId/restart', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieRestartSubscriptionController));
router.get('/subscriptions/upcoming', asyncHandler(isAuthenticated), asyncHandler(mollieController.mollieGetUpcomingSubscriptionsController));


// router.get('/products', asyncHandler(mollieController.getAllProducts));
// router.get('/products/:id', asyncHandler(mollieController.getProductById));

router.post("/webhook", asyncHandler(mollieController.webhookMollieController));

export default router;
