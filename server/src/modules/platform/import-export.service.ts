import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { parseCsv, toCsv } from './csv';

const MAX_IMPORT_ROWS = 2000;
const MAX_EXPORT_ROWS = 5000;
const IMPORT_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'language', 'country'] as const;
type ImportField = typeof IMPORT_FIELDS[number];

export const importSchema = z.object({
    csv: z.string().min(1).max(900_000),
    mapping: z.record(z.enum(IMPORT_FIELDS)),
    confirm: z.boolean().default(false),
}).strict();

const optional = z.string().trim().max(500).transform(value => value || null).nullable().default(null);
const personRow = z.object({
    firstName: z.string().trim().min(1).max(500), lastName: z.string().trim().max(500).default(''),
    email: z.string().trim().toLowerCase().email().or(z.literal('').transform((): null => null)).nullable().default(null),
    phone: optional, language: optional, country: optional,
});
type PersonRow = z.infer<typeof personRow>;

const mapRow = (header: string[], cells: string[], mapping: Record<string, ImportField>) => {
    const row: Partial<Record<ImportField, string>> = {};
    header.forEach((column, index) => { if (mapping[column]) row[mapping[column]] = cells[index] ?? ''; });
    return row;
};

// Pure: parses and validates the upload without touching the database.
export const planPeopleImport = (csv: string, mapping: Record<string, ImportField>) => {
    const [header = [], ...lines] = parseCsv(csv);
    if (lines.length > MAX_IMPORT_ROWS) throw new ApiError(400, 'IMPORT_TOO_LARGE', `Import at most ${MAX_IMPORT_ROWS} rows at a time`);
    const valid: PersonRow[] = [];
    const invalid: { row: number; error: string }[] = [];
    lines.forEach((cells, index) => {
        const result = personRow.safeParse(mapRow(header, cells, mapping));
        if (result.success) valid.push(result.data as PersonRow);
        else invalid.push({ row: index + 2, error: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') });
    });
    return { columns: header, valid, invalid };
};

const existingEmails = async (rows: PersonRow[]) => {
    const emails = rows.map(row => row.email).filter((email): email is string => Boolean(email));
    const found = await prisma.person.findMany({ where: { email: { in: emails } }, select: { email: true } });
    return new Set(found.map(person => person.email));
};

// Preview never mutates. Commit requires `confirm: true` and skips rows whose email already
// exists, so an import can never silently merge into or duplicate an existing contact.
export const importPeople = async (input: z.infer<typeof importSchema>, actorUserId: string) => {
    const plan = planPeopleImport(input.csv, input.mapping);
    const known = await existingEmails(plan.valid);
    const fresh = plan.valid.filter(row => !row.email || !known.has(row.email));
    const report = { columns: plan.columns, total: plan.valid.length + plan.invalid.length, toCreate: fresh.length, skippedExisting: plan.valid.length - fresh.length, invalid: plan.invalid.slice(0, 100), sample: fresh.slice(0, 5) };
    if (!input.confirm) return { committed: false, ...report };
    await prisma.$transaction(async tx => {
        await tx.person.createMany({ data: fresh.map(row => ({ ...row, firstName: row.firstName, lastName: row.lastName, displayName: `${row.firstName} ${row.lastName}`.trim(), source: 'IMPORT' as const })) });
        await tx.auditLog.create({ data: { actorUserId, action: 'PEOPLE_IMPORTED', entityType: 'Person', after: { created: fresh.length, skippedExisting: report.skippedExisting } } });
    });
    return { committed: true, ...report };
};

type Exporter = { columns: string[]; load: () => Promise<Record<string, unknown>[]> };
const take = MAX_EXPORT_ROWS;
const EXPORTERS: Record<string, Exporter> = {
    people: { columns: ['id', 'firstName', 'lastName', 'email', 'phone', 'language', 'country', 'status', 'createdAt'], load: () => prisma.person.findMany({ take, orderBy: { createdAt: 'desc' } }) },
    participants: { columns: ['id', 'firstName', 'lastName', 'email', 'language', 'country'], load: () => prisma.person.findMany({ take, where: { roles: { some: { role: 'PARTICIPANT' } } } }) },
    registrations: { columns: ['id', 'eventId', 'personId', 'status', 'registrationSource', 'createdAt'], load: () => prisma.registration.findMany({ take, orderBy: { createdAt: 'desc' } }) },
    orders: { columns: ['id', 'eventId', 'buyerPersonId', 'status', 'currency', 'subtotal', 'fees', 'total', 'orderedAt'], load: () => prisma.order.findMany({ take, orderBy: { orderedAt: 'desc' } }) },
    tickets: { columns: ['id', 'orderId', 'eventId', 'holderPersonId', 'ticketType', 'status', 'createdAt'], load: () => prisma.ticket.findMany({ take, orderBy: { createdAt: 'desc' } }) },
    finance: { columns: ['id', 'orderId', 'personId', 'amount', 'currency', 'status', 'method', 'paidAt'], load: () => prisma.payment.findMany({ take, orderBy: { createdAt: 'desc' } }) },
};
export const EXPORT_ENTITIES = Object.keys(EXPORTERS);
const FINANCE_EXPORTS = ['orders', 'finance'];

// Every export is audited; finance data additionally requires finance.read.
export const createExport = async (entity: string, user: { id: string; permissions: string[] }) => {
    const exporter = EXPORTERS[entity];
    if (!exporter) throw new ApiError(400, 'UNKNOWN_EXPORT', `Export one of: ${EXPORT_ENTITIES.join(', ')}`);
    if (FINANCE_EXPORTS.includes(entity) && !user.permissions.includes('finance.read')) throw new ApiError(403, 'FORBIDDEN', 'Permission required');
    const rows = await exporter.load();
    await prisma.auditLog.create({ data: { actorUserId: user.id, action: 'EXPORT_GENERATED', entityType: 'Export', after: { entity, rows: rows.length } } });
    return { entity, rows: rows.length, truncated: rows.length === MAX_EXPORT_ROWS, filename: `${entity}-${new Date().toISOString().slice(0, 10)}.csv`, csv: toCsv(exporter.columns, rows) };
};
