import { hiddenActivityPrefixes } from '../choreographers/relations.rules';
import { Request } from 'express';
import { z } from 'zod';
import { PersonRoleType } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { entityId, normalizePagination } from '../../common/http';
import { peopleService } from './people.service';
import { activityService } from '../activity/activity.service';
import { peopleFiltersSchema, personSchema, roleSchema } from './people.schemas';
import { createAuditLog, extractAuditContext } from '../audit/audit.service';
import { deleteEmailPerson, removalByPerson } from './person-removal';

export const listPeople = async (req: Request) => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const filters = peopleFiltersSchema.parse(req.query);

    const { data, total } = await peopleService.listPeople(filters, skip, pageSize);
    const removal = await removalByPerson(data.map(person => person.id));

    req.res!.json({ data: data.map(person => ({ ...person, removal: removal.get(person.id) })), meta: { page, pageSize, total } });
};

export const getPerson = async (req: Request) => {
    const id = entityId(req);
    const person = await peopleService.getPersonById(id, true);
    return { ...person, removal: (await removalByPerson([id])).get(id) };
};

// Only a contact that a mailbox created on its own; the service refuses everything else.
export const deletePerson = async (req: Request) => {
    const deleted = await deleteEmailPerson(entityId(req));
    await createAuditLog({ action: 'PERSON_DELETED', entityType: 'Person', entityId: deleted.id, before: deleted }, extractAuditContext(req));
    return { deleted: true };
};

export const createPerson = async (req: Request) => {
    const input = personSchema.parse(req.body);
    
    return prisma.$transaction(async (tx) => {
        const createdPerson = await peopleService.createPerson(input as any, tx);
        
        await activityService.recordHistory(tx, req, {
            type: 'PERSON_CREATED',
            entityType: 'Person',
            entityId: createdPerson.id,
            personId: createdPerson.id,
        });
        
        req.res!.status(201);
        return createdPerson;
    });
};

export const updatePerson = async (req: Request) => {
    const id = entityId(req);
    // Ensure person exists
    await peopleService.getPersonById(id);
    
    const input = personSchema.partial().parse(req.body);
    
    return prisma.$transaction(async (tx) => {
        const updatedPerson = await peopleService.updatePerson(id, input as any, tx);
        
        await activityService.recordHistory(tx, req, {
            type: 'PERSON_UPDATED',
            entityType: 'Person',
            entityId: id,
            personId: id,
        });
        
        return updatedPerson;
    });
};

export const assignRole = async (req: Request) => {
    const personId = entityId(req);
    await peopleService.getPersonById(personId);
    
    const { role } = roleSchema.parse(req.body);
    
    return prisma.$transaction(async (tx) => {
        const assignedRole = await peopleService.assignRole(personId, role, tx);
        
        await activityService.recordHistory(tx, req, {
            type: 'ROLE_ADDED',
            entityType: 'Person',
            entityId: personId,
            personId: personId,
            metadata: { role }
        });
        
        return assignedRole;
    });
};

export const removeRole = async (req: Request) => {
    const personId = entityId(req);
    const role = z.nativeEnum(PersonRoleType).parse(req.params.role);
    
    return prisma.$transaction(async (tx) => {
        await peopleService.removeRole(personId, role, tx);
        
        await activityService.recordHistory(tx, req, {
            type: 'ROLE_REMOVED',
            entityType: 'Person',
            entityId: personId,
            personId: personId,
            metadata: { role }
        });
        
        return { removed: true };
    });
};

export const assignTag = async (req: Request) => {
    const personId = entityId(req);
    await peopleService.getPersonById(personId);
    
    const input = z.object({
        name: z.string().trim().min(1).max(100),
        slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100)
    }).strict().parse(req.body) as { name: string; slug: string };
    
    return prisma.$transaction(async (tx) => {
        const assignedTag = await peopleService.assignTag(personId, input, tx);
        
        await activityService.recordHistory(tx, req, {
            type: 'TAG_ADDED',
            entityType: 'Tag',
            entityId: assignedTag.id,
            personId: personId,
            metadata: { slug: assignedTag.slug }
        });
        
        return assignedTag;
    });
};

export const removeTag = async (req: Request) => {
    const personId = entityId(req);
    const tagId = z.string().uuid().parse(req.params.tagId);
    
    return prisma.$transaction(async (tx) => {
        await peopleService.removeTag(personId, tagId, tx);
        
        await activityService.recordHistory(tx, req, {
            type: 'TAG_REMOVED',
            entityType: 'Tag',
            entityId: tagId,
            personId: personId,
        });
        
        return { removed: true };
    });
};

export const getPersonActivity = async (req: Request) => {
    const id = entityId(req);
    await peopleService.getPersonById(id);
    
    const { page, skip, pageSize } = normalizePagination(req.query);
    const permissions: string[] = req.res?.locals?.user?.permissions ?? [];
    const timeline = await activityService.getPersonTimeline(id, skip, pageSize, hiddenActivityPrefixes(permissions));
    
    req.res!.json({ data: timeline.data, meta: { page, pageSize, total: timeline.total } });
};
