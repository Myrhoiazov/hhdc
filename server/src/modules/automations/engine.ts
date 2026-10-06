import { Automation, AutomationAction, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { AutomationContext, executeAction } from './actions';
import { TOPIC_TRIGGERS } from './automation.schemas';
import { evaluateConditions, parseConditions } from './conditions';

type AutomationWithActions = Automation & { actions: AutomationAction[] };
const optionalId = z.string().uuid().optional().catch(undefined);
const payloadIds = z.object({ personId: optionalId, registrationId: optionalId, eventId: optionalId, orderId: optionalId, conversationId: optionalId });

const loadPerson = async (id?: string) => {
    const person = id ? await prisma.person.findUnique({ where: { id }, include: { tags: { include: { tag: true } }, roles: true } }) : null;
    if (!person) return undefined;
    return { id: person.id, language: person.language, country: person.country, status: person.status, tags: person.tags.map(item => item.tag.slug), roles: person.roles.map(item => item.role) };
};
const loadRegistration = async (id?: string) => (id ? await prisma.registration.findUnique({ where: { id }, select: { id: true, status: true, eventId: true, personId: true } }) : null) ?? undefined;
const loadEvent = async (id?: string) => (id ? await prisma.event.findUnique({ where: { id }, select: { id: true, name: true, status: true } }) : null) ?? undefined;
const loadOrder = async (id?: string) => {
    const order = id ? await prisma.order.findUnique({ where: { id }, select: { id: true, status: true, total: true } }) : null;
    return order ? { ...order, total: Number(order.total) } : undefined;
};

// The context is a read-only snapshot of the entities a trigger refers to.
export const buildContext = async (automation: Pick<Automation, 'id' | 'createdBy'>, payload: Record<string, unknown>): Promise<AutomationContext> => {
    const ids = payloadIds.parse(payload);
    const registration = await loadRegistration(ids.registrationId);
    const [person, event, order] = await Promise.all([
        loadPerson(ids.personId ?? registration?.personId),
        loadEvent(ids.eventId ?? registration?.eventId),
        loadOrder(ids.orderId),
    ]);
    return { payload, automation: { id: automation.id, createdBy: automation.createdBy }, person, registration, event, order, conversationId: ids.conversationId };
};

export const matchesAutomation = (automation: Pick<Automation, 'conditions'>, context: AutomationContext) =>
    evaluateConditions(parseConditions(automation.conditions), context as unknown as Record<string, unknown>);

interface RunOptions { dryRun: boolean; triggerEntityType?: string; triggerEntityId?: string }

const asJson = (value: unknown) => JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;

const runAction = async (runId: string, action: AutomationAction, context: AutomationContext, dryRun: boolean) => {
    const config = (action.config ?? {}) as Record<string, unknown>;
    const actionRun = await prisma.automationActionRun.create({ data: { automationRunId: runId, actionId: action.id, input: asJson({ type: action.type, config }) } });
    if (dryRun) {
        await prisma.automationActionRun.update({ where: { id: actionRun.id }, data: { status: 'SKIPPED', output: { dryRun: true, wouldExecute: action.type }, finishedAt: new Date() } });
        return null;
    }
    try {
        const output = await executeAction(action.type, config, context);
        await prisma.automationActionRun.update({ where: { id: actionRun.id }, data: { status: 'SUCCEEDED', output: asJson(output), finishedAt: new Date() } });
        return null;
    } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 500) : 'Action failed';
        await prisma.automationActionRun.update({ where: { id: actionRun.id }, data: { status: 'FAILED', error: message, finishedAt: new Date() } });
        return message;
    }
};

const notifyFailure = async (automation: AutomationWithActions, runId: string) => {
    if (!automation.createdBy) return;
    await prisma.notification.create({ data: { userId: automation.createdBy, type: 'AUTOMATION_FAILED', title: `Automation failed: ${automation.name}`, link: `/automations?run=${runId}` } });
};

// Every execution is persisted (run + one record per action) so it can be inspected later.
export const runAutomation = async (automation: AutomationWithActions, context: AutomationContext, options: RunOptions) => {
    const run = await prisma.automationRun.create({ data: {
        automationId: automation.id, triggerType: automation.triggerType, dryRun: options.dryRun,
        triggerEntityType: options.triggerEntityType, triggerEntityId: options.triggerEntityId, context: asJson(context),
    } });
    let failure: string | null = null;
    for (const action of [...automation.actions].sort((a, b) => a.position - b.position)) {
        failure = await runAction(run.id, action, context, options.dryRun);
        if (failure) break;
    }
    const status = failure ? 'FAILED' : options.dryRun ? 'SKIPPED' : 'SUCCEEDED';
    if (failure) await notifyFailure(automation, run.id);
    return prisma.automationRun.update({ where: { id: run.id }, data: { status, error: failure, finishedAt: new Date() }, include: { actionRuns: { orderBy: { startedAt: 'asc' } } } });
};

const triggerEntity = (payload: Record<string, unknown>) => {
    const ids = payloadIds.parse(payload);
    const candidates: [string, string | undefined][] = [['Registration', ids.registrationId], ['Order', ids.orderId], ['Person', ids.personId], ['Event', ids.eventId]];
    const [triggerEntityType, triggerEntityId] = candidates.find(([, id]) => Boolean(id)) ?? [undefined, undefined];
    return { triggerEntityType, triggerEntityId };
};

// Worker entry point: a domain event starts every ACTIVE automation whose conditions match.
export const handleDomainEvent = async (topic: string, payload: Record<string, unknown>) => {
    const triggerType = TOPIC_TRIGGERS[topic];
    if (!triggerType) return 0;
    const automations = await prisma.automation.findMany({ where: { status: 'ACTIVE', triggerType }, include: { actions: true } });
    let started = 0;
    for (const automation of automations) {
        const context = await buildContext(automation, payload);
        if (!matchesAutomation(automation, context)) continue;
        await runAutomation(automation, context, { dryRun: false, ...triggerEntity(payload) });
        started += 1;
    }
    return started;
};

const recentTriggerEvents = (triggerType: string) => {
    const topics = Object.entries(TOPIC_TRIGGERS).filter(([, trigger]) => trigger === triggerType).map(([topic]) => topic);
    return prisma.outboxEvent.count({ where: { topic: { in: topics }, createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } });
};

// Dry run against a sample payload: reports what would happen without executing side effects.
export const testAutomation = async (id: string, payload: Record<string, unknown>) => {
    const automation = await prisma.automation.findUnique({ where: { id }, include: { actions: true } });
    if (!automation) throw new ApiError(404, 'AUTOMATION_NOT_FOUND', 'Automation not found');
    const context = await buildContext(automation, payload);
    const matched = matchesAutomation(automation, context);
    const run = matched ? await runAutomation(automation, context, { dryRun: true, ...triggerEntity(payload) }) : null;
    return { matched, run, recentTriggerEvents: await recentTriggerEvents(automation.triggerType), sideEffects: automation.actions.map(action => action.type) };
};
