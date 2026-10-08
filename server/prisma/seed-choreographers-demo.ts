import 'dotenv/config';
import prisma from './prisma-client';
import { storage } from '../src/common/storage/storage';
import { addBioVersion } from '../src/modules/choreographers/bio.service';
import { createContact, createContactSchema, deactivateContact } from '../src/modules/choreographers/contacts.service';
import { expenseSchema, feeAgreementSchema, movePayment, paymentSchema, recordExpense, recordFeeAgreement, recordPayment } from '../src/modules/choreographers/finance.service';
import { addNote, addTask } from '../src/modules/choreographers/followup.service';
import { assignToEvent, updateAssignment } from '../src/modules/choreographers/history.service';
import { addPhoto } from '../src/modules/choreographers/media.service';
import { updateChoreographerSchema } from '../src/modules/choreographers/profile.schemas';
import { createChoreographer } from '../src/modules/choreographers/profile.service';
import { linkConversation } from '../src/modules/choreographers/relations.service';
import { createDocumentSchema, createPersonDocument, replaceDocumentFile } from '../src/modules/documents/document-files.service';
import {
    AGENCY, AssignmentSeed, CHOREOGRAPHERS, ChoreographerSeed, DEMO_DOMAIN, DEMO_EVENT_SLUG_PREFIX, DocumentSeed, EVENTS, EventKey, PaymentSeed, TaskSeed, THREADS, ThreadSeed,
} from './demo/choreographers.data';
import { demoPdf, demoPhoto } from './demo/files';

// Every record goes through the same validation schema and service as a request from the UI,
// so the demo data cannot drift into a shape the application itself would refuse.
//
// Demonstration data for the choreographer module: profiles, photos, event history, finance,
// documents, correspondence, notes and tasks. Nothing here talks to a mailbox: conversations are
// written straight into the database, so no email connection is needed to see the screens.
//
//   SEED_DEMO=true npm run seed:choreographers-demo          create (does nothing if already there)
//   SEED_DEMO=true npm run seed:choreographers-demo:reset    remove everything it created

const DAY_MS = 86_400_000;
const DOCUMENT_PERMISSIONS = ['documents.read', 'documents.sensitive.read', 'documents.write'];

interface Context { userId: string; events: Record<EventKey, string>; people: Record<string, string>; documents: Record<string, string> }

const demoPeople = () => prisma.person.findMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` } }, select: { id: true } });

const assertAllowed = (): void => {
    if (process.env.NODE_ENV === 'production' || process.env.MODE === 'production') throw new Error('Demo seed is disabled in production.');
    if (process.env.SEED_DEMO !== 'true') throw new Error('Set SEED_DEMO=true to explicitly create or remove demonstration data.');
};

const seedEvents = async (): Promise<Record<EventKey, string>> => {
    const ids = {} as Record<EventKey, string>;
    for (const event of EVENTS) {
        const slug = `${DEMO_EVENT_SLUG_PREFIX}${event.key}`;
        const data = { name: event.name, slug, status: event.status, startAt: new Date(event.startAt), endAt: new Date(event.endAt), timezone: 'Europe/Amsterdam', venueName: 'Demo Venue', city: 'Amsterdam', country: 'NL', capacity: 400 };
        ids[event.key] = (await prisma.event.upsert({ where: { slug }, create: data, update: {} })).id;
    }
    return ids;
};

const createPerson = (person: { firstName: string; lastName: string; email: string }) => prisma.person.create({
    data: { firstName: person.firstName, lastName: person.lastName, displayName: `${person.firstName} ${person.lastName}`, email: person.email, notes: 'Demonstration data.' },
});

const seedPhotos = async (seed: ChoreographerSeed, personId: string, userId: string): Promise<void> => {
    for (const [index, photo] of seed.photos.entries()) {
        await addPhoto({ personId, userId, upload: { content: await demoPhoto(seed.hue, index), filename: `${seed.key}-${index + 1}.jpg` }, details: photo });
    }
};

const seedContacts = async (seed: ChoreographerSeed, personId: string, userId: string): Promise<void> => {
    for (const { inactive, ...contact } of seed.contacts) {
        const created = await createContact(personId, createContactSchema.parse(contact), { userId });
        if (inactive) await deactivateContact(personId, created.id, { userId });
    }
};

const seedDocument = async (ctx: Context, personId: string, document: DocumentSeed, assignmentId?: string): Promise<void> => {
    const { key, lines, secondVersion, title, ...fields } = document;
    const actor = { userId: ctx.userId, permissions: DOCUMENT_PERMISSIONS };
    const created = await createPersonDocument({ personId, actor, input: createDocumentSchema.parse({ ...fields, title, assignmentId }), upload: { content: demoPdf(title, lines), filename: `${key}.pdf` } });
    ctx.documents[key] = created.id;
    if (secondVersion) await replaceDocumentFile(created.id, { content: demoPdf(title, [...lines, 'Version 2: signed copy.']), filename: `${key}-signed.pdf` }, actor);
};

const seedPayment = async (ctx: Context, assignmentId: string, payment: PaymentSeed): Promise<void> => {
    const { confirmedOn, pending, invoice, ...fields } = payment;
    const input = paymentSchema.parse({ ...fields, status: pending ? 'PENDING' : 'PLANNED', invoiceDocumentId: invoice ? ctx.documents[invoice] : undefined });
    const created = await recordPayment(assignmentId, input, { userId: ctx.userId });
    if (confirmedOn) await movePayment(created.id, { status: 'CONFIRMED', paymentDate: confirmedOn }, { userId: ctx.userId, canConfirm: true });
};

// Order matters: the invoice has to exist before a payment can point at it.
const seedAssignment = async (ctx: Context, personId: string, seed: AssignmentSeed): Promise<void> => {
    const actor = { userId: ctx.userId };
    const assignment = await assignToEvent(personId, { eventId: ctx.events[seed.event], roleTitle: seed.roleTitle, status: seed.status }, actor);
    if (seed.travelStatus || seed.hotelStatus) await updateAssignment(personId, assignment.id, { travelStatus: seed.travelStatus, hotelStatus: seed.hotelStatus }, actor);
    for (const fee of seed.fees ?? []) await recordFeeAgreement(assignment.id, feeAgreementSchema.parse(fee), actor);
    for (const expense of seed.expenses ?? []) await recordExpense(assignment.id, expenseSchema.parse(expense), actor);
    for (const document of seed.documents ?? []) await seedDocument(ctx, personId, document, assignment.id);
    for (const payment of seed.payments ?? []) await seedPayment(ctx, assignment.id, payment);
};

const seedTask = async (personId: string, task: TaskSeed, userId: string): Promise<void> => {
    const dueDate = task.dueInDays === null ? null : new Date(Date.now() + task.dueInDays * DAY_MS).toISOString();
    const created = await addTask(personId, { title: task.title, priority: task.priority, dueDate }, { userId });
    if (task.done) await prisma.task.update({ where: { id: created.id }, data: { status: 'DONE' } });
};

const seedChoreographer = async (ctx: Context, seed: ChoreographerSeed): Promise<void> => {
    const person = await createPerson(seed);
    ctx.people[seed.key] = person.id;
    await createChoreographer(person.id, updateChoreographerSchema.parse(seed.profile), ctx.userId);
    for (const bio of seed.bios) await addBioVersion(person.id, bio, ctx.userId);
    await seedContacts(seed, person.id, ctx.userId);
    await seedPhotos(seed, person.id, ctx.userId);
    for (const assignment of seed.assignments) await seedAssignment(ctx, person.id, assignment);
    for (const document of seed.documents ?? []) await seedDocument(ctx, person.id, document);
    for (const note of seed.notes) await addNote(person.id, note, { userId: ctx.userId });
    for (const task of seed.tasks) await seedTask(person.id, task, ctx.userId);
};

const daysAgo = (days: number): Date => new Date(Date.now() - days * DAY_MS);

const seedThread = async (ctx: Context, thread: ThreadSeed): Promise<void> => {
    const latest = Math.min(...thread.messages.map(message => message.daysAgo));
    const conversation = await prisma.conversation.create({ data: {
        personId: thread.owner ? ctx.people[thread.owner] : null, eventId: thread.event ? ctx.events[thread.event] : null,
        subject: thread.subject, status: thread.status, lastMessageAt: daysAgo(latest), createdAt: daysAgo(Math.max(...thread.messages.map(message => message.daysAgo))),
        messages: { create: thread.messages.map(message => ({
            direction: message.inbound ? 'INBOUND' as const : 'OUTBOUND' as const, sender: message.from, recipient: message.to, subject: thread.subject, bodyText: message.body,
            isRead: !message.unread, createdAt: daysAgo(message.daysAgo), receivedAt: message.inbound ? daysAgo(message.daysAgo) : null, sentAt: message.inbound ? null : daysAgo(message.daysAgo),
        })) },
    } });
    if (thread.linkTo) await linkConversation(ctx.people[thread.linkTo.key], conversation.id, { note: thread.linkTo.note }, { userId: ctx.userId });
};

const create = async (): Promise<void> => {
    if ((await demoPeople()).length) { console.log('Demo choreographers already exist. Run the :reset script first to recreate them.'); return; }
    const user = await prisma.user.findFirstOrThrow({ where: { isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true, email: true } });
    const ctx: Context = { userId: user.id, events: await seedEvents(), people: {}, documents: {} };
    ctx.people.agency = (await createPerson(AGENCY)).id;
    for (const seed of CHOREOGRAPHERS) await seedChoreographer(ctx, seed);
    for (const thread of THREADS) await seedThread(ctx, thread);
    console.log(`Created ${CHOREOGRAPHERS.length} demo choreographers, ${EVENTS.length} events and ${THREADS.length} conversations. Tasks are assigned to ${user.email}.`);
    console.log(`Open /people/choreographers/${ctx.people.jojo} for the fullest profile.`);
};

const removeStoredFiles = async (objectIds: string[]): Promise<void> => {
    const objects = await prisma.storageObject.findMany({ where: { id: { in: objectIds } }, select: { id: true, key: true } });
    for (const object of objects) await storage().remove(object.key).catch((): void => undefined);
    await prisma.storageObject.deleteMany({ where: { id: { in: objects.map(object => object.id) } } });
};

const removeDocumentsAndMedia = async (personIds: string[]): Promise<void> => {
    const documents = await prisma.document.findMany({ where: { entityType: 'Person', entityId: { in: personIds } }, select: { id: true } });
    const versions = await prisma.documentVersion.findMany({ where: { documentId: { in: documents.map(document => document.id) } }, select: { storageObjectId: true } });
    const media = await prisma.choreographerMedia.findMany({ where: { personId: { in: personIds } }, select: { originalObjectId: true, displayObjectId: true, thumbObjectId: true } });
    await prisma.document.deleteMany({ where: { id: { in: documents.map(document => document.id) } } });
    await prisma.choreographerMedia.deleteMany({ where: { personId: { in: personIds } } });
    await removeStoredFiles([...versions.map(version => version.storageObjectId), ...media.flatMap(item => [item.originalObjectId, item.displayObjectId, item.thumbObjectId])]);
};

// Audit log rows are left in place on purpose: an audit trail is not rewritten, even for demo data.
const reset = async (): Promise<void> => {
    const personIds = (await demoPeople()).map(person => person.id);
    const eventIds = (await prisma.event.findMany({ where: { slug: { startsWith: DEMO_EVENT_SLUG_PREFIX } }, select: { id: true } })).map(event => event.id);
    const demoAddress = { endsWith: `@${DEMO_DOMAIN}` };
    await prisma.eventChoreographer.deleteMany({ where: { personId: { in: personIds } } });
    await removeDocumentsAndMedia(personIds);
    await prisma.conversation.deleteMany({ where: { messages: { some: { OR: [{ sender: demoAddress }, { recipient: demoAddress }] } } } });
    await prisma.notification.deleteMany({ where: { type: 'TASK_REMINDER', OR: personIds.map(id => ({ link: { contains: id } })) } });
    await prisma.task.deleteMany({ where: { personId: { in: personIds } } });
    await prisma.activity.deleteMany({ where: { OR: [{ personId: { in: personIds } }, { eventId: { in: eventIds } }] } });
    await prisma.person.deleteMany({ where: { id: { in: personIds } } });
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
    console.log(`Removed ${personIds.length} demo people and ${eventIds.length} demo events.`);
};

const main = async (): Promise<void> => {
    assertAllowed();
    await (process.argv.includes('--reset') ? reset() : create());
};

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
}).finally(() => prisma.$disconnect());
