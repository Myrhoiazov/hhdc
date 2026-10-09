import { Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import type { ChoreographerProfileInput } from './profile.schemas';
import { profileChecklist, summarizeAssignments } from './profile.summary';

const PERSON_FIELDS = { id: true, firstName: true, lastName: true, displayName: true, email: true, phone: true, country: true, language: true, status: true } as const;
const ASSIGNMENT_FIELDS = { id: true, status: true, roleTitle: true, event: { select: { id: true, name: true, startAt: true, endAt: true } } } as const;
const OPEN_TASKS = ['TODO', 'IN_PROGRESS'] as const;
// The photo that stands for the choreographer: the cover, or the first one when none is marked.
const COVER_PHOTO = {
    where: { deletedAt: null } as Prisma.ChoreographerMediaWhereInput,
    orderBy: [{ isCover: 'desc' }, { position: 'asc' }] as Prisma.ChoreographerMediaOrderByWithRelationInput[],
    take: 1, select: { id: true },
};
const coverPhotoId = (media: { id: string }[]): string | null => media[0]?.id ?? null;

const isChoreographer: Prisma.PersonWhereInput = { roles: { some: { role: 'CHOREOGRAPHER' } }, mergedIntoId: null };

export interface ChoreographerListQuery { q?: string; relationshipStatus?: ChoreographerProfileInput['relationshipStatus'] }
interface Paging { page?: number; pageSize?: number; skip: number }

const listWhere = (query: ChoreographerListQuery): Prisma.PersonWhereInput => ({
    ...isChoreographer,
    ...(query.relationshipStatus ? { choreographerProfile: { is: { relationshipStatus: query.relationshipStatus } } } : {}),
    ...(query.q ? { OR: [
        { displayName: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { choreographerProfile: { is: { stageName: { contains: query.q, mode: 'insensitive' } } } },
    ] } : {}),
});

export const listChoreographers = async (query: ChoreographerListQuery, paging: Paging, now = new Date()) => {
    const where = listWhere(query);
    const [people, total] = await prisma.$transaction([
        prisma.person.findMany({
            where, skip: paging.skip, take: paging.pageSize ?? 25, orderBy: { displayName: 'asc' },
            select: { ...PERSON_FIELDS, choreographerProfile: true, choreographerAssignments: { select: ASSIGNMENT_FIELDS }, choreographerMedia: COVER_PHOTO },
        }),
        prisma.person.count({ where }),
    ]);
    const data = people.map(({ choreographerProfile, choreographerAssignments, choreographerMedia, ...person }) => ({
        person, profile: choreographerProfile, summary: summarizeAssignments(choreographerAssignments, now),
        coverPhotoId: coverPhotoId(choreographerMedia),
    }));
    return { data, meta: { page: paging.page ?? 1, pageSize: paging.pageSize ?? 25, total } };
};

// Someone assigned to an event from the event page gets the role without a profile; the profile
// is added the first time it is needed, so every choreographer can always be opened.
const ensureProfile = async (personId: string): Promise<void> => {
    const person = await prisma.person.findFirst({ where: { id: personId, ...isChoreographer }, select: { choreographerProfile: { select: { id: true } } } });
    if (!person) throw new ApiError(404, 'CHOREOGRAPHER_NOT_FOUND', 'Choreographer not found');
    if (!person.choreographerProfile) await prisma.choreographerProfile.upsert({ where: { personId }, create: { personId }, update: {} });
};

// A person is a choreographer only with the role; a profile alone (or a bare person id) is not enough.
const requireChoreographer = async (personId: string) => {
    await ensureProfile(personId);
    const person = await prisma.person.findFirst({
        where: { id: personId, ...isChoreographer },
        select: { ...PERSON_FIELDS, choreographerProfile: true, choreographerAssignments: { select: ASSIGNMENT_FIELDS, orderBy: { event: { startAt: 'desc' } } }, choreographerMedia: COVER_PHOTO },
    });
    if (!person || !person.choreographerProfile) throw new ApiError(404, 'CHOREOGRAPHER_NOT_FOUND', 'Choreographer not found');
    return { ...person, choreographerProfile: person.choreographerProfile };
};

// For the sub-resources of a profile (media, contacts, biographies): 404 unless the person is a choreographer.
export const assertChoreographer = (personId: string): Promise<void> => ensureProfile(personId);

export const getChoreographer = async (personId: string, now = new Date()) => {
    const { choreographerProfile: profile, choreographerAssignments: assignments, choreographerMedia, ...person } = await requireChoreographer(personId);
    const openTasks = await prisma.task.count({ where: { personId, status: { in: [...OPEN_TASKS] } } });
    return {
        person, profile, coverPhotoId: coverPhotoId(choreographerMedia),
        summary: { ...summarizeAssignments(assignments, now), openTasks },
        checklist: profileChecklist(profile, person),
        assignments: assignments.slice(0, 10),
    };
};

const profileData = (input: ChoreographerProfileInput, userId: string): Prisma.ChoreographerProfileUncheckedUpdateInput => ({ ...input, updatedById: userId });

// Creating twice is safe: the second call finds the profile and leaves it as it is.
export const createChoreographer = async (personId: string, input: ChoreographerProfileInput, userId: string) => {
    const person = await prisma.person.findFirst({ where: { id: personId, mergedIntoId: null }, select: { id: true } });
    if (!person) throw new ApiError(404, 'PERSON_NOT_FOUND', 'Person not found');
    await prisma.$transaction(async tx => {
        await tx.personRole.upsert({ where: { personId_role: { personId, role: 'CHOREOGRAPHER' } }, create: { personId, role: 'CHOREOGRAPHER' }, update: {} });
        const existing = await tx.choreographerProfile.findUnique({ where: { personId }, select: { id: true } });
        if (existing) return;
        const profile = await tx.choreographerProfile.create({ data: { ...(profileData(input, userId) as Prisma.ChoreographerProfileUncheckedCreateInput), personId } });
        await tx.activity.create({ data: { personId, actorUserId: userId, type: 'CHOREOGRAPHER_PROFILE_CREATED', entityType: 'ChoreographerProfile', entityId: profile.id, metadata: {} } });
        await tx.auditLog.create({ data: { actorUserId: userId, action: 'CHOREOGRAPHER_PROFILE_CREATED', entityType: 'ChoreographerProfile', entityId: profile.id } });
    });
    return getChoreographer(personId);
};

const changedFields = (before: Record<string, unknown>, input: ChoreographerProfileInput): string[] =>
    Object.keys(input).filter(key => JSON.stringify(before[key] ?? null) !== JSON.stringify((input as Record<string, unknown>)[key] ?? null));

export const updateChoreographer = async (personId: string, input: ChoreographerProfileInput, userId: string) => {
    const { choreographerProfile: before } = await requireChoreographer(personId);
    const changed = changedFields(before as unknown as Record<string, unknown>, input);
    if (!changed.length) return getChoreographer(personId);
    await prisma.$transaction(async tx => {
        const after = await tx.choreographerProfile.update({ where: { personId }, data: profileData(input, userId) });
        // The activity names the fields only; the audit log keeps the values.
        await tx.activity.create({ data: { personId, actorUserId: userId, type: 'CHOREOGRAPHER_PROFILE_UPDATED', entityType: 'ChoreographerProfile', entityId: after.id, metadata: { fields: changed } } });
        await tx.auditLog.create({ data: {
            actorUserId: userId, action: 'CHOREOGRAPHER_PROFILE_UPDATED', entityType: 'ChoreographerProfile', entityId: after.id,
            before: JSON.parse(JSON.stringify(Object.fromEntries(changed.map(key => [key, (before as unknown as Record<string, unknown>)[key]])))),
            after: JSON.parse(JSON.stringify(Object.fromEntries(changed.map(key => [key, (after as unknown as Record<string, unknown>)[key]])))),
        } });
    });
    return getChoreographer(personId);
};
