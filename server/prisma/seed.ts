import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash, argon2id } from 'argon2';

const prisma = new PrismaClient();
const permissions = [
    'people.read', 'people.write', 'people.merge', 'people.import', 'events.read', 'events.write',
    'ticketing.read', 'ticketing.sync', 'communications.read', 'communications.reply', 'communications.write',
    'campaigns.read', 'campaigns.send', 'automation.read', 'automation.manage',
    'ai.use', 'ai.manage', 'ai.actions.propose', 'ai.actions.confirm',
    'knowledge.read', 'knowledge.write', 'knowledge.manage', 'search.read',
    'tasks.read', 'tasks.write', 'checkin.use', 'checkin.override',
    'finance.read', 'finance.refund.request', 'finance.refund.approve',
    'choreographers.read', 'choreographers.create', 'choreographers.update',
    'choreographers.contacts.read', 'choreographers.contacts.manage', 'choreographers.media.manage', 'choreographers.events.manage',
    'choreographers.conversations.read', 'choreographers.conversations.link', 'choreographers.activity.read',
    'choreographers.notes.read', 'choreographers.notes.manage',
    'choreographers.finance.read', 'choreographers.finance.write', 'choreographers.payments.confirm',
    'documents.read', 'documents.sensitive.read', 'documents.write',
    'exports.create', 'gdpr.manage', 'privacy.export', 'privacy.anonymize',
    'api.manage', 'webhooks.manage', 'settings.manage', 'operations.read',
    'providers.read', 'providers.manage', 'users.manage', 'audit.read', 'dashboard.read',
];
// Least privilege: sensitive capabilities are granted explicitly, never by a name pattern.
const ADMIN_ONLY = ['users.manage', 'providers.manage', 'ai.manage', 'api.manage', 'webhooks.manage', 'settings.manage', 'gdpr.manage', 'privacy.anonymize', 'finance.refund.approve', 'people.merge', 'checkin.override', 'choreographers.payments.confirm'];
const VIEWER_EXCLUDED = ['audit.read', 'finance.read', 'choreographers.finance.read', 'documents.sensitive.read', 'choreographers.notes.read'];
const rolePermissions: Record<string, string[]> = {
    OWNER: permissions,
    ADMIN: permissions,
    EVENT_MANAGER: permissions.filter((key) => !ADMIN_ONLY.includes(key)),
    SUPPORT: ['dashboard.read', 'people.read', 'choreographers.read', 'choreographers.contacts.read', 'choreographers.conversations.read', 'choreographers.activity.read', 'events.read', 'ticketing.read', 'communications.read', 'communications.reply', 'ai.use', 'ai.actions.propose', 'ai.actions.confirm', 'knowledge.read', 'search.read', 'tasks.read', 'tasks.write', 'checkin.use', 'finance.refund.request'],
    VIEWER: permissions.filter((key) => key.endsWith('.read') && !VIEWER_EXCLUDED.includes(key)),
};

async function seedRoles() {
    for (const key of permissions) {
        await prisma.permission.upsert({ where: { key }, create: { key }, update: {} });
    }
    for (const [name, keys] of Object.entries(rolePermissions)) {
        const role = await prisma.role.upsert({ where: { name }, create: { name }, update: {} });
        const allowed = await prisma.permission.findMany({ where: { key: { in: keys } } });
        await prisma.rolePermission.createMany({
            data: allowed.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
            skipDuplicates: true,
        });
    }
}

async function seedOwner() {
    const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_OWNER_PASSWORD;
    if (!email || !password) throw new Error('Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD to provision the owner.');
    if (password.length < 12) throw new Error('Owner password must have at least 12 characters.');
    const existing = await prisma.user.findUnique({ where: { email } });
    const user = existing ?? await prisma.user.create({
        data: { email, name: process.env.SEED_OWNER_NAME ?? 'Owner', passwordHash: await hash(password, { type: argon2id }) },
    });
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'OWNER' } });
    await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { userId: user.id, roleId: role.id },
        update: {},
    });
}

async function main() {
    await seedRoles();
    await seedOwner();
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
}).finally(() => prisma.$disconnect());
