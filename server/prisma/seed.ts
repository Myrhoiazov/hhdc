import { PrismaClient } from '@prisma/client';
import { authentication, generateSalt } from '../src/common/utils/crypto';

const prisma = new PrismaClient();

const salt = generateSalt();
function makePassword(password: string): string {
    const hashedPassword = authentication(salt, password);
    return hashedPassword;
}

async function up() {
    await prisma.user.createMany({
        data: [
            {
                firstName: 'Denys',
                lastName: 'Myrhoiazov',
                email: 'test@test.com',
                role: 'ADMIN',
                salt: salt,
                password: makePassword('test'),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ],
    });
}

async function down() {
    const tables = ['sessions', 'users'];

    await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);

    for (const table of tables) {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\`;`);
    }

    await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
}

async function main() {
    try {
        await down();
        await up();
    } catch (e) {
        console.error(e);
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process?.exit(1);
    });
