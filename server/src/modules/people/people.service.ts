import { Prisma, PersonRoleType } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';

export interface CreatePersonInput {
    firstName: string;
    lastName: string;
    displayName?: string;
    email?: string | null;
    phone?: string | null;
    birthDate?: Date | null;
    language?: string | null;
    country?: string | null;
    notes?: string | null;
    status?: any; // PersonStatus enum
}

export interface MatchPersonInput {
    email?: string | null;
    phone?: string | null;
    externalIdentity?: {
        providerConnectionId: string;
        entityType: string;
        externalId: string;
    };
}

export const peopleService = {
    /**
     * Retrieve a person by ID.
     */
    async getPersonById(id: string, includeAll = false) {
        const include = includeAll 
            ? { 
                roles: true, 
                tags: { include: { tag: true } }, 
                registrations: { take: 25, include: { event: true } }, 
                choreographerAssignments: { take: 25, include: { event: true } }, 
                orders: { take: 25 }, 
                tickets: { take: 25 } 
              }
            : { roles: true, tags: { include: { tag: true } } };

        const person = await prisma.person.findUnique({
            where: { id },
            include,
        });

        if (!person) {
            throw new ApiError(404, 'PERSON_NOT_FOUND', 'Person not found');
        }
        return person;
    },

    /**
     * List people with optional search and pagination.
     */
    async listPeople(query: string | undefined, skip: number, take: number) {
        const where: Prisma.PersonWhereInput = query
            ? {
                  OR: ['displayName', 'email', 'phone'].map(field => ({
                      [field]: { contains: query, mode: 'insensitive' },
                  })),
              }
            : {};

        const [data, total] = await prisma.$transaction([
            prisma.person.findMany({
                where,
                include: { roles: true, tags: { include: { tag: true } } },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.person.count({ where }),
        ]);

        return { data, total };
    },

    /**
     * Safe matching logic (Section 32): ExternalIdentity > exact email > exact phone
     */
    async matchPerson(input: MatchPersonInput): Promise<string | null> {
        // 1. Check ExternalIdentity
        if (input.externalIdentity) {
            const extId = await prisma.externalIdentity.findUnique({
                where: {
                    providerConnectionId_entityType_externalId: {
                        providerConnectionId: input.externalIdentity.providerConnectionId,
                        entityType: input.externalIdentity.entityType,
                        externalId: input.externalIdentity.externalId,
                    }
                }
            });
            if (extId) return extId.entityId;
        }

        // 2. Check exact email
        if (input.email) {
            const emailNormalized = input.email.toLowerCase().trim();
            const personByEmail = await prisma.person.findFirst({
                where: { email: emailNormalized },
                orderBy: { createdAt: 'asc' }, // Prefer the oldest record if duplicates exist
            });
            if (personByEmail) return personByEmail.id;
        }

        // 3. Check exact phone
        if (input.phone) {
            const personByPhone = await prisma.person.findFirst({
                where: { phone: input.phone },
                orderBy: { createdAt: 'asc' },
            });
            if (personByPhone) return personByPhone.id;
        }

        return null; // No match found
    },

    /**
     * Create a new person.
     */
    async createPerson(input: CreatePersonInput, tx?: Prisma.TransactionClient) {
        const db = tx || prisma;
        
        const email = input.email ? input.email.toLowerCase().trim() : null;
        const displayName = input.displayName ?? `${input.firstName} ${input.lastName}`.trim();

        return db.person.create({
            data: {
                ...input,
                email,
                displayName,
            },
            include: { roles: true, tags: { include: { tag: true } } },
        });
    },

    /**
     * Update an existing person.
     */
    async updatePerson(id: string, input: Partial<CreatePersonInput>, tx?: Prisma.TransactionClient) {
        const db = tx || prisma;
        
        const dataToUpdate: any = { ...input };
        if (input.email !== undefined) {
            dataToUpdate.email = input.email ? input.email.toLowerCase().trim() : null;
        }
        if (input.firstName !== undefined || input.lastName !== undefined) {
            // Only update displayName if explicitly provided or if names change and it's not provided
            if (input.displayName === undefined) {
                // To safely construct display name, we'd need existing names, but let's just let it be if not provided explicitly, or we fetch first.
                // For simplicity, we just use what's passed if we have both
                if (input.firstName !== undefined && input.lastName !== undefined) {
                    dataToUpdate.displayName = `${input.firstName} ${input.lastName}`.trim();
                }
            }
        }

        return db.person.update({
            where: { id },
            data: dataToUpdate,
            include: { roles: true, tags: { include: { tag: true } } },
        });
    },

    /**
     * Assign a role to a person.
     */
    async assignRole(personId: string, role: PersonRoleType, tx?: Prisma.TransactionClient) {
        const db = tx || prisma;
        return db.personRole.upsert({
            where: { personId_role: { personId, role } },
            create: { personId, role },
            update: {},
        });
    },

    /**
     * Remove a role from a person.
     */
    async removeRole(personId: string, role: PersonRoleType, tx?: Prisma.TransactionClient) {
        const db = tx || prisma;
        await db.personRole.deleteMany({
            where: { personId, role },
        });
        return { removed: true };
    },

    /**
     * Assign a tag to a person.
     */
    async assignTag(personId: string, tagData: { name: string; slug: string }, tx?: Prisma.TransactionClient) {
        const db = tx || prisma;
        
        // Ensure tag exists
        const tag = await db.tag.upsert({
            where: { slug: tagData.slug },
            create: { name: tagData.name, slug: tagData.slug },
            update: {},
        });

        // Link person and tag
        await db.personTag.upsert({
            where: { personId_tagId: { personId, tagId: tag.id } },
            create: { personId, tagId: tag.id },
            update: {},
        });

        return tag;
    },

    /**
     * Remove a tag from a person.
     */
    async removeTag(personId: string, tagId: string, tx?: Prisma.TransactionClient) {
        const db = tx || prisma;
        await db.personTag.deleteMany({
            where: { personId, tagId },
        });
        return { removed: true };
    }
};
