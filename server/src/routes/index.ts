import express from "express";
import authinticationRouter from "../modules/auth/auth.routes";
import usersRouter from "../modules/users/users.routes";
import profileRouter from '../modules/auth/auth.profiles.routes'
import clientsRouter from '../modules/clients/clients.routes'
import commentsRouter from '../modules/comments/comments.routes'
import transactionsRouter from '../modules/transactions/transactions.routes'
import instagramRouter from '../modules/communication/instagram/instagram.routes'
import mollieRouter from '../modules/payments/payments.routes'
import scheduleRouter from '../modules/schedule/schedule.routes'
import companyRouter from '../modules/company/company.routes'
import invoicesRouter from '../modules/invoices/invoices.routes'
import emailRouter from '../modules/communication/email/email.routes'
import searchRouter from '../modules/search/search.routes'
import paymentRemindersRouter from '../modules/payment-reminders/payment-reminders.routes'
import healthRouter from '../modules/health/health.routes'
import authSecurityEventsRouter from '../modules/auth/auth.security-events.routes'
import telegramApprovalRouter from '../modules/ai-email-assistant/telegram-approval.routes'
import aiEmailSimulationRouter from '../modules/ai-email-assistant/simulation.routes'
import aiPromptRouter from '../modules/ai-email-assistant/prompt.routes'
import aiRuntimeSettingsRouter from '../modules/ai-email-assistant/runtime-settings.routes'
import telegramNotificationSettingsRouter from '../modules/communication/telegram/notification-settings.routes'
import knowledgeRouter from '../modules/knowledge-ingestion/knowledge-ingestion.routes'

const router = express.Router();

export default (): express.Router => {
    router.use('/health', healthRouter)
    router.use('/auth', authinticationRouter)
    router.use('/users', usersRouter)
    router.use('/clients', clientsRouter)
    router.use('/profile', profileRouter)
    router.use('/comments', commentsRouter)
    router.use('/transactions', transactionsRouter)
    router.use('/mollie', mollieRouter)
    router.use('/schedule', scheduleRouter)
    router.use('/company', companyRouter)
    router.use('/invoices', invoicesRouter)
    router.use('/email', emailRouter)
    router.use('/search', searchRouter)
    router.use('/payment-reminders', paymentRemindersRouter)
    router.use('/auth-security-events', authSecurityEventsRouter)
    router.use('/telegram', telegramApprovalRouter)
    router.use('/ai-email', aiEmailSimulationRouter)
    router.use('/ai-email/prompts', aiPromptRouter)
    router.use('/ai-email/settings', aiRuntimeSettingsRouter)
    router.use('/telegram-notifications', telegramNotificationSettingsRouter)
    router.use('/knowledge', knowledgeRouter)

    router.use('/instagram', instagramRouter)

    return router;
}
