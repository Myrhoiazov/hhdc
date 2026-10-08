import { ChoreographerContactKind } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { assertChoreographer } from './profile.service';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform(value => (value === '' ? null : value));
const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal('').transform((): null => null));

const contactFields = {
    kind: z.nativeEnum(ChoreographerContactKind),
    contactPersonId: z.string().uuid().nullable().optional(),
    name: optionalText(200), organization: optionalText(200),
    // Lower-cased so that the same address always compares equal.
    email: z.string().trim().toLowerCase().email().max(320).nullable().optional().or(z.literal('').transform((): null => null)),
    phone: optionalText(50), locale: optionalText(16), preferredChannel: optionalText(40), notes: optionalText(2000),
    isPrimary: z.boolean().optional(), isActive: z.boolean().optional(),
    validFrom: optionalDate, validTo: optionalDate,
};

// A contact has to say how to reach someone, or who it is.
const reachable = (value: { name?: string | null; email?: string | null; phone?: string | null }) => Boolean(value.name || value.email || value.phone);

export const createContactSchema = z.object(contactFields).strict().refine(reachable, 'Give a name, an email or a phone');
export const updateContactSchema = z.object(contactFields).partial().strict();
export type ContactInput = z.infer<typeof updateContactSchema>;

const toDate = (value: string | null): Date | null => (value ? new Date(`${value}T00:00:00Z`) : null);
const toData = ({ validFrom, validTo, ...rest }: ContactInput) => ({ ...rest, ...(validFrom !== undefined ? { validFrom: toDate(validFrom) } : {}), ...(validTo !== undefined ? { validTo: toDate(validTo) } : {}) });

export const listContacts = async (personId: string) => {
    await assertChoreographer(personId);
    return prisma.choreographerContact.findMany({ where: { personId }, orderBy: [{ isActive: 'desc' }, { isPrimary: 'desc' }, { createdAt: 'asc' }] });
};

const requireContact = async (personId: string, contactId: string) => {
    const contact = await prisma.choreographerContact.findFirst({ where: { id: contactId, personId } });
    if (!contact) throw new ApiError(404, 'CONTACT_NOT_FOUND', 'Contact not found');
    return contact;
};

interface Actor { userId: string }

const audit = (action: string, entityId: string, actor: Actor) => ({ actorUserId: actor.userId, action, entityType: 'ChoreographerContact', entityId });

export const createContact = async (personId: string, input: z.infer<typeof createContactSchema>, actor: Actor) => {
    await assertChoreographer(personId);
    return prisma.$transaction(async tx => {
        if (input.isPrimary) await tx.choreographerContact.updateMany({ where: { personId, isPrimary: true }, data: { isPrimary: false } });
        const contact = await tx.choreographerContact.create({ data: { ...toData(input), kind: input.kind, personId } });
        await tx.auditLog.create({ data: audit('CHOREOGRAPHER_CONTACT_CREATED', contact.id, actor) });
        return contact;
    });
};

export const updateContact = async (personId: string, contactId: string, input: ContactInput, actor: Actor) => {
    await requireContact(personId, contactId);
    return prisma.$transaction(async tx => {
        if (input.isPrimary) await tx.choreographerContact.updateMany({ where: { personId, isPrimary: true, id: { not: contactId } }, data: { isPrimary: false } });
        const contact = await tx.choreographerContact.update({ where: { id: contactId }, data: toData(input) });
        await tx.auditLog.create({ data: audit('CHOREOGRAPHER_CONTACT_UPDATED', contact.id, actor) });
        return contact;
    });
};

// A former manager stays on record as inactive: old correspondence still has to make sense.
export const deactivateContact = async (personId: string, contactId: string, actor: Actor, today = new Date()) => {
    const existing = await requireContact(personId, contactId);
    return prisma.$transaction(async tx => {
        const contact = await tx.choreographerContact.update({ where: { id: contactId }, data: { isActive: false, isPrimary: false, validTo: existing.validTo ?? today } });
        await tx.auditLog.create({ data: audit('CHOREOGRAPHER_CONTACT_DEACTIVATED', contact.id, actor) });
        return contact;
    });
};
