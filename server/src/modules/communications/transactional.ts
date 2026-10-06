import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { emailProvider } from './send';
import { renderTemplate } from './template-render';

const inputSchema = z.object({
    templateId: z.string().uuid(),
    providerConnectionId: z.string().uuid(),
    personId: z.string().uuid(),
    eventId: z.string().uuid().nullable().optional(),
});

const templateContext = async (personId: string, eventId?: string | null) => {
    const person = await prisma.person.findUniqueOrThrow({ where: { id: personId } });
    const event = eventId ? await prisma.event.findUnique({ where: { id: eventId } }) : null;
    return { person, variables: { person: { firstName: person.firstName, lastName: person.lastName, language: person.language }, event: event ? { name: event.name, startAt: event.startAt.toISOString() } : undefined } };
};

// Worker handler for `email.send`: one transactional, template-based message to one person.
export const sendTemplatedEmail = async (payload: unknown) => {
    const input = inputSchema.parse(payload);
    const template = await prisma.communicationTemplate.findUniqueOrThrow({ where: { id: input.templateId } });
    const { person, variables } = await templateContext(input.personId, input.eventId);
    if (!person.email || person.status !== 'ACTIVE') throw new Error('Person has no deliverable email address');
    const subject = renderTemplate(template.subject, variables);
    const content = renderTemplate(template.bodyText ?? template.bodyHtml, variables);
    const { connection, provider } = await emailProvider(input.providerConnectionId);
    const { sender } = z.object({ sender: z.string().email() }).parse(connection.settings);
    const sent = await provider.sendMessage({ sender, recipient: person.email, subject, content });
    await prisma.activity.create({ data: { personId: person.id, eventId: input.eventId ?? null, type: 'EMAIL_SENT', entityType: 'CommunicationTemplate', entityId: template.id, metadata: { externalId: sent.externalId } } });
    return sent;
};
