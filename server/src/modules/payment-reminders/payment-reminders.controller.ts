import { Request, Response } from 'express';
import { ClientLanguage, PaymentReminderStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import {
    getAllPaymentReminderTemplates,
    getPaymentReminderSettings,
    getStudioContactInfo,
    reminderSettingsSelect,
    reminderTemplateSelect,
    runPaymentReminders,
} from './payment-reminders.service';
import { buildReminderEmail, PAYMENT_REMINDER_PLACEHOLDERS } from './payment-reminders.content.service';
import { composeEmail } from '../communication/email/email-smtp.service';

export const getPaymentReminderSettingsController = async (_req: Request, res: Response) => {
    const settings = await getPaymentReminderSettings();
    return res.status(200).json(settings);
};

const updateSettingsSchema = z.object({
    offsetDays: z.union([z.literal(3), z.literal(7)]),
    sendHour: z.number().int().min(0).max(23),
    sendMinute: z.number().int().min(0).max(59),
    senderEmailAccountId: z.number().int().positive().nullable().optional(),
    enabled: z.boolean(),
}).strict();

export const updatePaymentReminderSettingsController = async (req: Request, res: Response) => {
    const parsedBody = updateSettingsSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json({
            message: 'Проверьте настройки рассылки',
            details: parsedBody.error.flatten(),
        });
    }

    const settings = await prisma.paymentReminderSettings.upsert({
        where: { id: 1 },
        update: { ...parsedBody.data, updatedById: req.user?.id },
        create: { id: 1, ...parsedBody.data, updatedById: req.user?.id },
        select: reminderSettingsSelect,
    });

    return res.status(200).json(settings);
};

export const runPaymentRemindersController = async (req: Request, res: Response) => {
    try {
        const result = await runPaymentReminders(req.user?.id);
        return res.status(200).json(result);
    } catch (error) {
        console.error('Manual payment reminder run failed:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Matches ReminderDelivery in
// client/src/pages/PaymentRemindersPage/ui/PaymentRemindersPage/useReminderDeliveries.ts —
// drops subscriptionId/sentAt/triggeredById and the unused nested subscription.id.
const deliveryListSelect = {
    id: true,
    targetPaymentDate: true,
    status: true,
    language: true,
    recipientEmail: true,
    errorMessage: true,
    createdAt: true,
    subscription: {
        select: {
            description: true,
            customer: {
                select: {
                    client: { select: { firstName: true, lastName: true } },
                },
            },
        },
    },
} satisfies Prisma.PaymentReminderDeliverySelect;

export const getPaymentReminderDeliveriesController = async (req: Request, res: Response) => {
    const statusParam = req.query.status;
    const status = typeof statusParam === 'string' && statusParam in PaymentReminderStatus
        ? statusParam as PaymentReminderStatus
        : undefined;
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const deliveries = await prisma.paymentReminderDelivery.findMany({
        where: status ? { status } : undefined,
        select: deliveryListSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    return res.status(200).json(deliveries);
};

export const getPaymentReminderTemplatesController = async (_req: Request, res: Response) => {
    const templates = await getAllPaymentReminderTemplates();
    return res.status(200).json({ templates, placeholders: PAYMENT_REMINDER_PLACEHOLDERS });
};

const updateTemplateSchema = z.object({
    subject: z.string().trim().min(1, 'Тема письма обязательна').max(998),
    bodyHtml: z.string().trim().min(1, 'Текст письма обязателен').max(20000),
}).strict();

export const updatePaymentReminderTemplateController = async (req: Request, res: Response) => {
    const language = req.params.language as ClientLanguage;
    if (!Object.values(ClientLanguage).includes(language)) {
        return res.status(400).json({ message: 'Неизвестный язык' });
    }

    const parsedBody = updateTemplateSchema.safeParse(req.body);
    if (!parsedBody.success) {
        return res.status(400).json({
            message: 'Проверьте текст шаблона',
            details: parsedBody.error.flatten(),
        });
    }

    const data: Prisma.PaymentReminderTemplateUncheckedCreateInput = {
        language,
        subject: parsedBody.data.subject,
        bodyHtml: parsedBody.data.bodyHtml,
        updatedById: req.user?.id,
    };
    const template = await prisma.paymentReminderTemplate.upsert({
        where: { language },
        update: data,
        create: data,
        select: reminderTemplateSelect,
    });

    return res.status(200).json(template);
};

const sendTestSchema = z.object({
    to: z.string().trim().email('Некорректный email'),
    subject: z.string().trim().min(1, 'Тема письма обязательна').max(998),
    bodyHtml: z.string().trim().min(1, 'Текст письма обязателен').max(20000),
}).strict();

// Sends whatever is currently in the editor (saved or not) with sample data, straight
// to the given address — no PaymentReminderDelivery row, this isn't tied to a real
// subscription/payment cycle, it's purely for the admin to check the copy renders and lands.
export const sendTestPaymentReminderController = async (req: Request, res: Response) => {
    const language = req.params.language as ClientLanguage;
    if (!Object.values(ClientLanguage).includes(language)) {
        return res.status(400).json({ message: 'Неизвестный язык' });
    }

    const parsedBody = sendTestSchema.safeParse(req.body);
    if (!parsedBody.success) {
        return res.status(400).json({
            message: 'Проверьте данные для теста',
            details: parsedBody.error.flatten(),
        });
    }

    const settings = await getPaymentReminderSettings();
    if (!settings.senderEmailAccountId) {
        return res.status(400).json({ message: 'Сначала выберите email-ящик отправителя в настройках' });
    }

    const sampleDate = new Date();
    sampleDate.setDate(sampleDate.getDate() + settings.offsetDays);
    const studio = await getStudioContactInfo();

    const { subject, html } = buildReminderEmail(language, {
        clientName: 'Тестовый клиент',
        amountValue: '80.00',
        currency: 'EUR',
        paymentDate: sampleDate,
        studio,
    }, { subject: parsedBody.data.subject, bodyHtml: parsedBody.data.bodyHtml });

    try {
        await composeEmail(settings.senderEmailAccountId, {
            to: [parsedBody.data.to],
            subject: `[Тест] ${subject}`,
            html,
        });
        return res.status(200).json({ message: 'Тестовое письмо отправлено' });
    } catch (error) {
        console.error('Test payment reminder send failed:', error);
        return res.status(502).json({ message: error instanceof Error ? error.message : 'Не удалось отправить письмо' });
    }
};
