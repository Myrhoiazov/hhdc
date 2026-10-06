import { AutomationStatus, RegistrationStatus } from '@prisma/client';
import { z } from 'zod';
import { conditionsSchema } from './conditions';

export const TRIGGER_TYPES = [
    'PERSON_CREATED', 'ROLE_ADDED', 'REGISTRATION_CREATED', 'REGISTRATION_CANCELLED', 'CHECK_IN_COMPLETED',
    'ORDER_CREATED', 'ORDER_PAID', 'TICKET_CREATED', 'EMAIL_RECEIVED', 'CONVERSATION_RESOLVED',
    'EVENT_STARTING', 'SESSION_STARTING', 'PAYMENT_FAILED', 'CHOREOGRAPHER_CONFIRMED', 'CONTRACT_SIGNED', 'SCHEDULE',
] as const;
export type TriggerType = typeof TRIGGER_TYPES[number];

// Domain event topic → automation trigger. Topics without a mapping never start an automation.
export const TOPIC_TRIGGERS: Record<string, TriggerType> = {
    'person.created': 'PERSON_CREATED',
    'person.role_added': 'ROLE_ADDED',
    'registration.created': 'REGISTRATION_CREATED',
    'registration.cancelled': 'REGISTRATION_CANCELLED',
    'checkin.completed': 'CHECK_IN_COMPLETED',
    'order.created': 'ORDER_CREATED',
    'payment.paid': 'ORDER_PAID',
    'payment.failed': 'PAYMENT_FAILED',
    'ticket.created': 'TICKET_CREATED',
    'email.received': 'EMAIL_RECEIVED',
    'conversation.resolved': 'CONVERSATION_RESOLVED',
    'choreographer.confirmed': 'CHOREOGRAPHER_CONFIRMED',
    'contract.signed': 'CONTRACT_SIGNED',
};

const text = z.string().trim().min(1).max(300);

// Refunds, deletions and permission changes are deliberately absent: automation only
// coordinates predefined safe actions (spec §32).
export const ACTION_CONFIG_SCHEMAS = {
    ADD_TAG: z.object({ tagSlug: text }).strict(),
    REMOVE_TAG: z.object({ tagSlug: text }).strict(),
    CREATE_TASK: z.object({ title: text, description: z.string().max(5000).optional(), priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'), dueInDays: z.number().int().min(0).max(365).optional(), assigneeId: z.string().uuid().optional() }).strict(),
    CREATE_NOTIFICATION: z.object({ userId: z.string().uuid(), title: text, message: z.string().max(2000).optional() }).strict(),
    UPDATE_REGISTRATION: z.object({ status: z.nativeEnum(RegistrationStatus) }).strict(),
    SEND_EMAIL: z.object({ templateId: z.string().uuid(), providerConnectionId: z.string().uuid() }).strict(),
    GENERATE_AI_DRAFT: z.object({}).strict(),
    WEBHOOK: z.object({ eventType: z.string().regex(/^[a-z]+(\.[a-z_]+)+$/).max(100) }).strict(),
} as const;

export type ActionType = keyof typeof ACTION_CONFIG_SCHEMAS;
export const ACTION_TYPES = Object.keys(ACTION_CONFIG_SCHEMAS) as ActionType[];

const actionSchema = z.object({ type: z.enum(ACTION_TYPES as [ActionType, ...ActionType[]]), config: z.record(z.unknown()).default({}) }).strict()
    .transform(action => ({ type: action.type, config: ACTION_CONFIG_SCHEMAS[action.type].parse(action.config) as Record<string, unknown> }));

export const automationSchema = z.object({
    name: text,
    triggerType: z.enum(TRIGGER_TYPES),
    triggerConfig: z.record(z.unknown()).default({}),
    conditions: conditionsSchema.or(z.object({}).strict()).default({}),
    actions: z.array(actionSchema).min(1).max(10),
}).strict();

export const automationStatusSchema = z.nativeEnum(AutomationStatus);
export type AutomationInput = z.infer<typeof automationSchema>;
