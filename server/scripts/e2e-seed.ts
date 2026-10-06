import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/modules/auth/auth.password.service';

const prisma = new PrismaClient();

const main = async () => {
    const branch = await prisma.branch.create({
        data: { name: 'E2E Central', city: 'Amsterdam' },
    });

    await prisma.user.create({
        data: {
            firstName: 'E2E',
            lastName: 'Admin',
            email: 'e2e.admin@example.test',
            password: await hashPassword('e2e-password-2026'),
            role: UserRole.ADMIN,
            isActive: true,
            isEnabled: true,
        },
    });

    await prisma.client.create({
        data: {
            firstName: 'E2E',
            lastName: 'Seed Client',
            email: 'seed.client@example.test',
            branchId: branch.id,
        },
    });
};

main()
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
        console.error(error);
        await prisma.$disconnect();
        process.exitCode = 1;
    });
