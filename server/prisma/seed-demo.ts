import 'dotenv/config';
import {
    ClientLanguage, ExpenseCategory, GroupLevel, InvoiceStatus,
    LoyaltyLevel, PaymentMethod, Prisma, PrismaClient, TransactionType,
} from '@prisma/client';

// Local demo data only. No external APIs, mail delivery, or Mollie records.
const prisma = new PrismaClient();
const marker = 'ddc-demo-seed-v1';
const today = new Date();
today.setUTCHours(12, 0, 0, 0);
const daysFromToday = (days: number) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + days);
    return date;
};

const firstNames = [
    'Anna', 'Sofia', 'Emma', 'Olivia', 'Mila', 'Eva', 'Nora', 'Julia', 'Sara', 'Lina',
    'Noah', 'Liam', 'Lucas', 'Milan', 'Adam', 'Daan', 'Max', 'Leon', 'Finn', 'Alex',
];
const lastNames = ['de Vries', 'Jansen', 'Kovalenko', 'Bakker', 'Melnyk'];
const cities = ['Amsterdam', 'Rotterdam', 'Utrecht', 'Den Haag'];
const styles = ['Hip-Hop', 'Contemporary', 'Jazz Funk', 'Heels', 'Breaking', 'Kids Dance'];
const levels = [GroupLevel.START, GroupLevel.FAN, GroupLevel.PRO];
const languages = [ClientLanguage.NL, ClientLanguage.EN, ClientLanguage.RU];
const loyaltyLevels = [LoyaltyLevel.BRONZE, LoyaltyLevel.SILVER, LoyaltyLevel.GOLD, LoyaltyLevel.PLATINUM];
const methods = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.BANK_TRANSFER];
const statuses = [
    InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.ISSUED,
    InvoiceStatus.OVERDUE, InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED,
];

type DemoTx = Prisma.TransactionClient;

const createDemoOrganizationAndBrands = async (tx: DemoTx) => {
    const organization = await tx.legalOrganization.create({
        data: {
            legalName: 'DDC Demo Dance Academy',
            registrationAddress: 'Demo Studio 1', city: 'Amsterdam', countryCode: 'NL',
            email: 'office@ddc-demo.example.test', website: 'https://ddc-demo.example.test',
        },
    });
    const brands = [];
    const brandNames = ['DDC Demo Academy', 'DDC Demo Kids'];
    for (let index = 0; index < brandNames.length; index += 1) {
        const name = brandNames[index];
        brands.push(await tx.businessBrand.create({
            data: {
                organizationId: organization.id, name,
                slug: index === 0 ? marker : `${marker}-kids`,
                email: 'office@ddc-demo.example.test',
                address: 'Demo Studio 1, Amsterdam',
                primaryColor: index === 0 ? '#6c4dd8' : '#e29032',
                isDefault: index === 0 && !(await tx.businessBrand.findFirst({ where: { isDefault: true } })),
            },
        }));
    }
    return { organization, brands };
};

const createDemoBranchesAndHalls = async (tx: DemoTx) => {
    const branches = [];
    const halls = [];
    for (let index = 0; index < cities.length; index += 1) {
        const city = cities[index];
        branches.push(await tx.branch.create({
            data: {
                name: `DDC Demo ${city}`, city, address: `Demo Studio ${index + 1}`,
                email: `studio${index + 1}@ddc-demo.example.test`,
                description: 'Демонстрационная локация танцевальной школы.',
            },
        }));
        for (const room of ['A', 'B']) {
            halls.push(await tx.hall.create({
                data: { name: `Demo ${city} — ${room}`, capacity: 20 },
            }));
        }
    }
    return { branches, halls };
};

const createDemoTeachers = async (tx: DemoTx) => {
    const teachers = [];
    for (let i = 0; i < 8; i += 1) {
        teachers.push(await tx.choreographer.create({
            data: {
                firstName: firstNames[i], lastName: 'Demo Instructor',
                email: `teacher${i + 1}@ddc-demo.example.test`, experience: 3 + i,
                category: levels[i % levels.length], showOnSite: false,
                description: `Демо-преподаватель: ${styles[i % styles.length]}.`,
            },
        }));
    }
    return teachers;
};

const createDemoStyles = (tx: DemoTx) => tx.danceStyle.createMany({
    data: styles.map((name) => ({ name, nameEn: name, description: `Демо: ${name}`, isActive: true })),
});

const createDemoGroups = async (
    tx: DemoTx,
    branches: Array<{ id: number }>,
    halls: Array<{ id: number }>,
    teachers: Array<{ id: number }>,
) => {
    const groups = [];
    for (let i = 0; i < 12; i += 1) {
        const branchIndex = i % branches.length;
        const block = Math.floor(i / branches.length);
        const hour = 16 + block * 2;
        groups.push(await tx.danceGroup.create({
            data: {
                name: `Demo ${styles[i % styles.length]} ${cities[branchIndex]} ${levels[block]}`,
                style: styles[i % styles.length], level: levels[block],
                maxParticipants: 20, lessonPriceCents: 1500 + block * 250,
                branchId: branches[branchIndex].id,
                hallId: halls[branchIndex * 2 + block % 2].id,
                choreographerId: teachers[branchIndex * 2 + block % 2].id,
                slots: {
                    create: ['Понедельник', 'Четверг'].map((dayOfWeek) => ({
                        dayOfWeek, startTime: `${hour}:00`, endTime: `${hour + 1}:00`,
                    })),
                },
            },
        }));
    }
    return groups;
};

const STUDENT_COMMENTS = [
    'Интересуется дополнительными занятиями.', 'Предпочитает вечернее расписание.',
    'Готовится к выступлению.', 'Пришёл после пробного занятия.',
];

const createDemoStudent = async (
    tx: DemoTx,
    index: number,
    group: Awaited<ReturnType<typeof createDemoGroups>>[number],
    actorId?: number,
) => {
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[Math.floor(index / firstNames.length)];
    const email = `demo.student${String(index + 1).padStart(3, '0')}@example.test`;
    const client = await tx.client.create({
        data: {
            firstName, lastName, email, branchId: group.branchId,
            birthday: `${1985 + index % 28}-${String(1 + index % 12).padStart(2, '0')}-${String(1 + index % 28).padStart(2, '0')}`,
            preferredLanguage: languages[index % languages.length],
            description: `Демо-ученик ${index + 1}. Синтетические данные для проверки админки.`,
            createdAt: daysFromToday(-180 + index),
            document: index % 4 !== 0,
            groupMemberships: { create: { groupId: group.id } },
            statuses: { create: { loyaltyLevel: loyaltyLevels[index % loyaltyLevels.length], notes: 'Демонстрационный статус' } },
            comments: {
                create: {
                    text: STUDENT_COMMENTS[index % STUDENT_COMMENTS.length],
                    userId: actorId,
                },
            },
        },
    });
    return { client, firstName, lastName, email };
};

interface DemoInvoiceContext {
    client: Awaited<ReturnType<typeof createDemoStudent>>['client'];
    firstName: string;
    lastName: string;
    email: string;
    group: Awaited<ReturnType<typeof createDemoGroups>>[number];
    brand: Awaited<ReturnType<typeof createDemoOrganizationAndBrands>>['brands'][number];
    organization: Awaited<ReturnType<typeof createDemoOrganizationAndBrands>>['organization'];
    actorId?: number;
}

const createDemoInvoiceForStudent = async (tx: DemoTx, index: number, ctx: DemoInvoiceContext) => {
    const { client, firstName, lastName, email, group, brand, organization, actorId } = ctx;
    const status = statuses[index % statuses.length];
    const totalCents = group.lessonPriceCents * 4;
    const paidAmountCents = status === InvoiceStatus.PAID ? totalCents
        : status === InvoiceStatus.PARTIALLY_PAID ? totalCents / 2 : 0;
    const issueDate = daysFromToday(status === InvoiceStatus.OVERDUE ? -45 : -7);
    const paidAt = daysFromToday(-2);
    await tx.invoice.create({
        data: {
            number: `DEMO-${today.getUTCFullYear()}-${String(index + 1).padStart(4, '0')}`,
            status, clientId: client.id, businessBrandId: brand.id,
            billToName: `${firstName} ${lastName}`, billToEmail: email,
            issueDate, dueDate: daysFromToday(status === InvoiceStatus.OVERDUE ? -15 : 14),
            paidAt: status === InvoiceStatus.PAID ? paidAt : null,
            totalCents, paidAmountCents, balanceDueCents: totalCents - paidAmountCents,
            issuerName: brand.name, issuerLegalName: organization.legalName,
            issuerEmail: brand.email, issuerAddress: brand.address,
            issuerPrimaryColor: brand.primaryColor,
            showPaymentButton: false, showPaymentQr: false,
            note: 'Демонстрационный счёт. Не отправлять и не оплачивать.',
            createdById: actorId, updatedById: actorId, createdAt: issueDate,
            items: {
                create: {
                    groupId: group.id, description: `${group.style} — 4 занятия`,
                    period: issueDate.toISOString().slice(0, 7), quantity: 4,
                    unitPriceCents: group.lessonPriceCents, totalCents,
                },
            },
            payments: paidAmountCents > 0 ? {
                create: {
                    amountCents: paidAmountCents, paidAt, method: index % 2 === 0 ? 'BANK_TRANSFER' : 'CASH',
                    reference: `DEMO-PAYMENT-${index + 1}`, note: 'Демонстрационная ручная оплата',
                    createdById: actorId,
                },
            } : undefined,
            auditLogs: {
                create: { action: 'DEMO_SEED', actorId, newValues: { status, totalCents, paidAmountCents } },
            },
        },
    });
};

interface DemoStudentsDeps {
    groups: Awaited<ReturnType<typeof createDemoGroups>>;
    brands: Awaited<ReturnType<typeof createDemoOrganizationAndBrands>>['brands'];
    organization: Awaited<ReturnType<typeof createDemoOrganizationAndBrands>>['organization'];
    actorId?: number;
}

const createDemoStudentsAndInvoices = async (tx: DemoTx, deps: DemoStudentsDeps): Promise<void> => {
    for (let index = 0; index < 100; index += 1) {
        const group = deps.groups[index % deps.groups.length];
        const brand = deps.brands[index % deps.brands.length];
        const { client, firstName, lastName, email } = await createDemoStudent(tx, index, group, deps.actorId);
        await createDemoInvoiceForStudent(tx, index, {
            client, firstName, lastName, email, group, brand,
            organization: deps.organization, actorId: deps.actorId,
        });
    }
};

const DEMO_EXPENSES = [
    { category: ExpenseCategory.HUIS, description: 'Аренда студии', amount: 250 },
    { category: ExpenseCategory.KOMUNALKA, description: 'Коммунальные услуги', amount: 85 },
    { category: ExpenseCategory.PRODUCTS, description: 'Вода и расходные материалы', amount: 24.5 },
    { category: ExpenseCategory.AUTO, description: 'Транспорт на выступление', amount: 45 },
    { category: ExpenseCategory.OTHER, description: 'Реклама занятий', amount: 65 },
    { category: ExpenseCategory.HEALTH, description: 'Спортивный инвентарь', amount: 35 },
    { category: ExpenseCategory.PHARMACY, description: 'Аптечка студии', amount: 18.5 },
];

const createDemoExpensesAndTransactions = (tx: DemoTx) => tx.transaction.createMany({
    data: Array.from({ length: 180 }, (_, i) => {
        const expense = DEMO_EXPENSES[Math.floor(i / 3) % DEMO_EXPENSES.length];
        const isExpense = i % 3 === 0;
        const date = daysFromToday(-Math.floor(i / 2));
        return {
            type: isExpense ? TransactionType.EXPENSE : TransactionType.INCOME,
            amount: isExpense ? expense.amount : 30 + (i % 6) * 15,
            category: isExpense ? expense.category : ExpenseCategory.OTHER,
            description: `DEMO: ${isExpense ? expense.description : 'Мастер-класс / разовое занятие'} #${i + 1}`,
            date, createdAt: date, paymentMethod: methods[Math.floor(i / 3) % methods.length],
        };
    }),
});

const DEMO_SEED_SUMMARY = {
    students: 100, branches: 4, halls: 8, choreographers: 8, styles: 6,
    groups: 12, scheduleSlots: 24, memberships: 100, comments: 100,
    clientStatuses: 100, invoices: 100, invoicePayments: 34,
    transactions: 180, organizations: 1, brands: 2, mollie: 0,
};

const seedDemoData = async (tx: DemoTx) => {
    if (await tx.businessBrand.findUnique({ where: { slug: marker } })) {
        return { skipped: true, reason: 'Demo dataset already exists; no changes made.' };
    }

    const actor = await tx.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { id: 'asc' } });
    const { organization, brands } = await createDemoOrganizationAndBrands(tx);
    const { branches, halls } = await createDemoBranchesAndHalls(tx);
    const teachers = await createDemoTeachers(tx);
    await createDemoStyles(tx);
    const groups = await createDemoGroups(tx, branches, halls, teachers);
    await createDemoStudentsAndInvoices(tx, { groups, brands, organization, actorId: actor?.id });
    await createDemoExpensesAndTransactions(tx);

    return DEMO_SEED_SUMMARY;
};

async function main() {
    if (process.env.MODE !== 'development' || process.env.NODE_ENV === 'production') {
        throw new Error('Demo seed requires MODE=development and must not run in production.');
    }

    const result = await prisma.$transaction(seedDemoData, { timeout: 60000 });

    console.log(JSON.stringify(result, null, 2));
}

main()
    .catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
