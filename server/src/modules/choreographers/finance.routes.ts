import { Request, Router } from 'express';
import { z } from 'zod';
import { route } from '../../common/http';
import { currentUser, hasPermission, permitted } from '../auth/auth.middleware';
import {
    cancelExpense, cancelFeeAgreement, expenseSchema, feeAgreementSchema, getFinance, movePayment, paymentSchema, paymentStatusSchema,
    recordExpense, recordFeeAgreement, recordPayment, updateExpense,
} from './finance.service';

const param = (req: Request, name: string) => z.string().uuid().parse(req.params[name]);
const actor = (req: Request) => ({ userId: currentUser(req).id });
const WRITE = permitted('choreographers.finance.write');

// Reading the ledger is a separate permission: without it the API answers 403, never masked totals.
export const choreographerFinanceReadRoutes = Router();
choreographerFinanceReadRoutes.get('/:personId/finance', permitted('choreographers.finance.read'), route(req => getFinance(param(req, 'personId'))));

// Writes are addressed by the assignment, which already names the choreographer and the event.
export const choreographerAssignmentRoutes = Router();
choreographerAssignmentRoutes.post('/:assignmentId/fee-agreements', WRITE, route(req => recordFeeAgreement(param(req, 'assignmentId'), feeAgreementSchema.parse(req.body), actor(req))));
choreographerAssignmentRoutes.post('/fee-agreements/:agreementId/cancel', WRITE, route(req => cancelFeeAgreement(param(req, 'agreementId'), actor(req))));
choreographerAssignmentRoutes.post('/:assignmentId/expenses', WRITE, route(req => recordExpense(param(req, 'assignmentId'), expenseSchema.parse(req.body), actor(req))));
choreographerAssignmentRoutes.put('/expenses/:expenseId', WRITE, route(req => updateExpense(param(req, 'expenseId'), expenseSchema.parse(req.body), actor(req))));
choreographerAssignmentRoutes.post('/expenses/:expenseId/cancel', WRITE, route(req => cancelExpense(param(req, 'expenseId'), actor(req))));
choreographerAssignmentRoutes.post('/:assignmentId/payments', WRITE, route(req => recordPayment(param(req, 'assignmentId'), paymentSchema.parse(req.body), actor(req))));
choreographerAssignmentRoutes.post('/payments/:paymentId/status', WRITE, route(req => movePayment(param(req, 'paymentId'), paymentStatusSchema.parse(req.body), {
    ...actor(req), canConfirm: hasPermission(currentUser(req).permissions, 'choreographers.payments.confirm'),
})));
