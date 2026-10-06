import prisma from '../../../prisma/prisma-client';
import { generateDraft } from '../ai/draft.service';
import { enqueueWebhookDeliveries } from '../webhooks/webhooks.service';
import { ACTION_CONFIG_SCHEMAS, ActionType } from './automation.schemas';

export interface AutomationContext {
    payload: Record<string, unknown>;
    automation: { id: string; createdBy: string | null };
    person?: { id: string; language: string | null; country: string | null; status: string; tags: string[]; roles: string[] };
    registration?: { id: string; status: string; eventId: string };
    event?: { id: string; name: string; status: string };
    order?: { id: string; status: string; total: number };
    conversationId?: string;
}

type ActionOutput = Record<string, unknown>;
type Executor = (config: Record<string, unknown>, context: AutomationContext) => Promise<ActionOutput>;

const requirePerson = (context: AutomationContext) => {
    if (!context.person) throw new Error('Trigger has no person to act on');
    return context.person;
};

const addTag: Executor = async (config, context) => {
    const { tagSlug } = ACTION_CONFIG_SCHEMAS.ADD_TAG.parse(config);
    const person = requirePerson(context);
    const tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });
    if (!tag) throw new Error(`Tag ${tagSlug} does not exist`);
    await prisma.personTag.upsert({ where: { personId_tagId: { personId: person.id, tagId: tag.id } }, create: { personId: person.id, tagId: tag.id }, update: {} });
    return { tagId: tag.id, personId: person.id };
};

const removeTag: Executor = async (config, context) => {
    const { tagSlug } = ACTION_CONFIG_SCHEMAS.REMOVE_TAG.parse(config);
    const removed = await prisma.personTag.deleteMany({ where: { personId: requirePerson(context).id, tag: { slug: tagSlug } } });
    return { removed: removed.count };
};

const createTask: Executor = async (config, context) => {
    const input = ACTION_CONFIG_SCHEMAS.CREATE_TASK.parse(config);
    const dueDate = input.dueInDays === undefined ? null : new Date(Date.now() + input.dueInDays * 86_400_000);
    const task = await prisma.task.create({ data: {
        title: input.title, description: input.description, priority: input.priority, dueDate, assigneeId: input.assigneeId,
        eventId: context.event?.id, personId: context.person?.id, createdBy: context.automation.createdBy,
    } });
    return { taskId: task.id };
};

const createNotification: Executor = async (config) => {
    const input = ACTION_CONFIG_SCHEMAS.CREATE_NOTIFICATION.parse(config);
    const notification = await prisma.notification.create({ data: { userId: input.userId, type: 'AUTOMATION', title: input.title, message: input.message } });
    return { notificationId: notification.id };
};

const updateRegistration: Executor = async (config, context) => {
    const { status } = ACTION_CONFIG_SCHEMAS.UPDATE_REGISTRATION.parse(config);
    if (!context.registration) throw new Error('Trigger has no registration to update');
    await prisma.registration.update({ where: { id: context.registration.id }, data: { status } });
    return { registrationId: context.registration.id, status };
};

// Transactional email is queued through the outbox; the worker performs the provider call.
const sendEmail: Executor = async (config, context) => {
    const input = ACTION_CONFIG_SCHEMAS.SEND_EMAIL.parse(config);
    const event = await prisma.outboxEvent.create({ data: { topic: 'email.send', payload: { ...input, personId: requirePerson(context).id, eventId: context.event?.id ?? null } } });
    return { outboxEventId: event.id };
};

// The draft still needs human approval before anything is sent (ADR 0005).
const generateAiDraft: Executor = async (_config, context) => {
    if (!context.conversationId) throw new Error('Trigger has no conversation to draft a reply for');
    if (!context.automation.createdBy) throw new Error('Automation has no owner to attribute the draft to');
    const draft = await generateDraft(context.conversationId, context.automation.createdBy);
    return { draftId: draft.id };
};

const webhook: Executor = async (config, context) => {
    const { eventType } = ACTION_CONFIG_SCHEMAS.WEBHOOK.parse(config);
    const queued = await enqueueWebhookDeliveries(eventType, JSON.parse(JSON.stringify(context.payload)));
    return { queued };
};

const EXECUTORS: Record<ActionType, Executor> = {
    ADD_TAG: addTag,
    REMOVE_TAG: removeTag,
    CREATE_TASK: createTask,
    CREATE_NOTIFICATION: createNotification,
    UPDATE_REGISTRATION: updateRegistration,
    SEND_EMAIL: sendEmail,
    GENERATE_AI_DRAFT: generateAiDraft,
    WEBHOOK: webhook,
};

export const executeAction = (type: string, config: Record<string, unknown>, context: AutomationContext) => {
    const executor = EXECUTORS[type as ActionType];
    if (!executor) throw new Error(`Unsupported automation action: ${type}`);
    return executor(config, context);
};
