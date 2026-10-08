// Demonstration content for the choreographer module. Every person and address is fictional and
// lives under DEMO_DOMAIN, which is also how the data is found again for removal.

export const DEMO_DOMAIN = 'demo.hhdc.test';
export const DEMO_EVENT_SLUG_PREFIX = 'demo-hhdc-';
export const MAILBOX = `info@${DEMO_DOMAIN}`;
const address = (name: string) => `${name}@${DEMO_DOMAIN}`;

export type EventKey = '2025' | '2026' | '2027';

export const EVENTS: Array<{ key: EventKey; name: string; startAt: string; endAt: string; status: 'COMPLETED' | 'PUBLISHED' }> = [
    { key: '2025', name: 'High Heels Dance Camp 2025 (demo)', startAt: '2025-07-10T08:00:00Z', endAt: '2025-07-13T18:00:00Z', status: 'COMPLETED' },
    { key: '2026', name: 'High Heels Dance Camp 2026 (demo)', startAt: '2026-07-09T08:00:00Z', endAt: '2026-07-12T18:00:00Z', status: 'COMPLETED' },
    { key: '2027', name: 'High Heels Dance Camp 2027 (demo)', startAt: '2027-07-08T08:00:00Z', endAt: '2027-07-11T18:00:00Z', status: 'PUBLISHED' },
];

export interface FeeStep { status: 'PROPOSED' | 'COUNTERED' | 'AGREED'; amount: string; currency: string; notes?: string }
export interface ExpenseSeed { category: 'TRAVEL' | 'HOTEL' | 'PER_DIEM' | 'TRANSFER'; description: string; currency: string; estimatedAmount?: string; actualAmount?: string; paidBy?: 'ORGANIZER' | 'CHOREOGRAPHER'; reimbursable?: boolean }
export interface PaymentSeed { type: 'ADVANCE' | 'FEE' | 'REIMBURSEMENT'; amount: string; currency: string; reference?: string; confirmedOn?: string; pending?: boolean; invoice?: string }
export interface DocumentSeed {
    key: string; type: 'CONTRACT' | 'INVOICE' | 'RIDER' | 'TRAVEL'; title: string; lines: string[]; secondVersion?: boolean;
    contractStatus?: 'SENT' | 'SIGNED'; invoiceStatus?: 'RECEIVED' | 'APPROVED'; invoiceNumber?: string; issuerName?: string; amount?: string; currency?: string;
}
export interface AssignmentSeed {
    event: EventKey; status: 'INVITED' | 'CONFIRMED' | 'COMPLETED'; roleTitle: string; travelStatus?: 'PENDING' | 'BOOKED'; hotelStatus?: 'PENDING' | 'BOOKED';
    fees?: FeeStep[]; expenses?: ExpenseSeed[]; documents?: DocumentSeed[]; payments?: PaymentSeed[];
}
export interface ContactSeed { kind: 'SELF_SECONDARY' | 'MANAGER' | 'ACCOUNTING' | 'ASSISTANT'; name?: string; organization?: string; email?: string; phone?: string; isPrimary?: boolean; notes?: string; inactive?: boolean }
export interface TaskSeed { title: string; priority: 'LOW' | 'NORMAL' | 'HIGH'; dueInDays: number | null; done?: boolean }
export interface ChoreographerSeed {
    key: string; firstName: string; lastName: string; email: string; hue: number; photos: Array<{ caption: string; credit?: string; rightsStatus: 'PERMITTED' | 'RESTRICTED' | 'UNKNOWN' }>;
    profile: Record<string, unknown>;
    bios: Array<{ locale: string; kind: 'SHORT' | 'FULL' | 'PROMO'; content: string }>;
    contacts: ContactSeed[]; assignments: AssignmentSeed[]; documents?: DocumentSeed[];
    notes: Array<{ content: string; isPinned?: boolean }>; tasks: TaskSeed[];
}

export const AGENCY = { firstName: 'Sam', lastName: 'Lee', email: address('sam.lee.agency'), organization: 'Stage Motion Agency (demo)' };
const agencyContact: ContactSeed = { kind: 'MANAGER', name: 'Sam Lee', organization: AGENCY.organization, email: AGENCY.email, phone: '+31 20 555 0101', isPrimary: true, notes: 'Handles fees and contracts. Represents several choreographers.' };

const jojo: ChoreographerSeed = {
    key: 'jojo', firstName: 'Joanna', lastName: 'Gomez', email: address('jojo.gomez'), hue: 330,
    photos: [
        { caption: 'Press portrait 2026', credit: 'Demo Studio', rightsStatus: 'PERMITTED' },
        { caption: 'Class at HHDC 2026', credit: 'HHDC media team', rightsStatus: 'PERMITTED' },
        { caption: 'Backstage', rightsStatus: 'RESTRICTED' },
        { caption: 'Promo shot for 2027', credit: 'Demo Studio', rightsStatus: 'UNKNOWN' },
    ],
    profile: {
        stageName: 'Jojo Gomez', countryCode: 'US', city: 'Los Angeles', timezone: 'America/Los_Angeles', relationshipStatus: 'RETURNING',
        bioShort: 'Los Angeles based heels choreographer, teaching at HHDC since 2025.',
        instagramUrl: 'https://instagram.com/demo.jojo', websiteUrl: 'https://example.com/jojo', youtubeUrl: 'https://youtube.com/@demo-jojo',
        styles: ['Heels', 'Jazz funk', 'Commercial'], languages: ['English', 'Spanish'],
    },
    bios: [
        { locale: 'en', kind: 'SHORT', content: 'Los Angeles based heels choreographer, teaching at HHDC since 2025.' },
        { locale: 'en', kind: 'FULL', content: 'Joanna "Jojo" Gomez is a choreographer and teacher from Los Angeles. She has taught heels and jazz funk at camps across Europe and returns to High Heels Dance Camp for the third year. (Demo text.)' },
        { locale: 'en', kind: 'FULL', content: 'Joanna "Jojo" Gomez is a choreographer and teacher from Los Angeles, known for musical, detail-driven heels classes. She has taught at camps across Europe and returns to High Heels Dance Camp for the third year in 2027. (Demo text, second version.)' },
        { locale: 'ru', kind: 'SHORT', content: 'Хореограф из Лос-Анджелеса, преподаёт heels на HHDC с 2025 года. (Демо-текст.)' },
        { locale: 'en', kind: 'PROMO', content: 'Three years, three sold-out classes. Jojo is back at HHDC 2027. (Demo text.)' },
    ],
    contacts: [
        agencyContact,
        { kind: 'SELF_SECONDARY', name: 'Jojo (private)', email: address('jojo.private') },
        { kind: 'ACCOUNTING', name: 'Maria Ortiz', organization: 'JG Dance LLC (demo)', email: address('accounting.jg'), notes: 'Send remittance advice here.' },
        { kind: 'ASSISTANT', name: 'Former assistant', email: address('old.assistant'), inactive: true },
    ],
    assignments: [
        {
            event: '2025', status: 'COMPLETED', roleTitle: 'Guest choreographer', travelStatus: 'BOOKED', hotelStatus: 'BOOKED',
            fees: [{ status: 'AGREED', amount: '1500', currency: 'EUR', notes: 'First year, two classes.' }],
            expenses: [
                { category: 'TRAVEL', description: 'LAX - AMS return', currency: 'EUR', estimatedAmount: '800', actualAmount: '820' },
                { category: 'HOTEL', description: '4 nights', currency: 'EUR', actualAmount: '450' },
            ],
            payments: [{ type: 'FEE', amount: '1500', currency: 'EUR', reference: 'Bank transfer 2025-07', confirmedOn: '2025-07-20' }],
        },
        {
            event: '2026', status: 'COMPLETED', roleTitle: 'Headline choreographer', travelStatus: 'BOOKED', hotelStatus: 'BOOKED',
            fees: [
                { status: 'PROPOSED', amount: '2000', currency: 'EUR', notes: 'Our opening offer.' },
                { status: 'COUNTERED', amount: '2800', currency: 'EUR', notes: 'Agency asked for more because of a third class.' },
                { status: 'AGREED', amount: '2500', currency: 'EUR', notes: 'Three classes and one showcase.' },
            ],
            expenses: [
                { category: 'TRAVEL', description: 'LAX - AMS return', currency: 'EUR', estimatedAmount: '900', actualAmount: '940' },
                { category: 'HOTEL', description: '5 nights', currency: 'EUR', actualAmount: '480' },
                { category: 'PER_DIEM', description: 'Meals paid by Jojo', currency: 'EUR', actualAmount: '150', paidBy: 'CHOREOGRAPHER', reimbursable: true },
            ],
            documents: [
                { key: 'jojo-contract-2026', type: 'CONTRACT', title: 'Contract HHDC 2026', contractStatus: 'SIGNED', secondVersion: true, lines: ['Demo contract between HHDC and Joanna Gomez.', 'Fee: EUR 2500. Three classes and one showcase.', 'This is generated demonstration content.'] },
                { key: 'jojo-invoice-2026', type: 'INVOICE', title: 'Invoice INV-2026-014', invoiceStatus: 'APPROVED', invoiceNumber: 'INV-2026-014', issuerName: 'JG Dance LLC (demo)', amount: '2500', currency: 'EUR', lines: ['Invoice INV-2026-014', 'Teaching fee HHDC 2026: EUR 2500.00', 'Demonstration content.'] },
                { key: 'jojo-travel-2026', type: 'TRAVEL', title: 'Flight itinerary July 2026', lines: ['LAX - AMS 7 July 2026, AMS - LAX 13 July 2026.', 'Demonstration content.'] },
            ],
            payments: [
                { type: 'ADVANCE', amount: '500', currency: 'EUR', reference: 'Advance', confirmedOn: '2026-05-15', invoice: 'jojo-invoice-2026' },
                { type: 'FEE', amount: '2000', currency: 'EUR', reference: 'Final payment', confirmedOn: '2026-07-20', invoice: 'jojo-invoice-2026' },
                { type: 'REIMBURSEMENT', amount: '150', currency: 'EUR', reference: 'Per diem', pending: true },
            ],
        },
        {
            event: '2027', status: 'INVITED', roleTitle: 'Headline choreographer', travelStatus: 'PENDING', hotelStatus: 'PENDING',
            fees: [{ status: 'PROPOSED', amount: '3000', currency: 'EUR', notes: 'Offer sent to the agency, waiting for an answer.' }],
            expenses: [{ category: 'TRAVEL', description: 'LAX - AMS return (estimate)', currency: 'EUR', estimatedAmount: '950' }],
            documents: [{ key: 'jojo-contract-2027', type: 'CONTRACT', title: 'Contract HHDC 2027 (draft sent)', contractStatus: 'SENT', lines: ['Demo contract for HHDC 2027.', 'Fee to be confirmed.', 'Demonstration content.'] }],
        },
    ],
    documents: [{ key: 'jojo-rider', type: 'RIDER', title: 'Technical rider', lines: ['Sound: wireless headset microphone.', 'Floor: sprung, no carpet.', 'Demonstration content.'] }],
    notes: [
        { content: 'All fee talks go through Sam Lee at the agency; Jojo prefers WhatsApp only for travel-day logistics.', isPinned: true },
        { content: 'Vegetarian. Prefers morning classes.' },
        { content: 'Asked in 2026 for a hotel room away from the lift.' },
    ],
    tasks: [
        { title: 'Follow up on the 2027 fee offer with the agency', priority: 'HIGH', dueInDays: -2 },
        { title: 'Request updated promo photos for 2027', priority: 'NORMAL', dueInDays: 1 },
        { title: 'Book flights for July 2027', priority: 'NORMAL', dueInDays: 45 },
        { title: 'Send the signed 2026 contract to accounting', priority: 'LOW', dueInDays: null, done: true },
    ],
};

const mila: ChoreographerSeed = {
    key: 'mila', firstName: 'Mila', lastName: 'Novak', email: address('mila.novak'), hue: 200,
    photos: [{ caption: 'Portrait', credit: 'Demo Studio', rightsStatus: 'PERMITTED' }, { caption: 'Workshop in Prague', rightsStatus: 'UNKNOWN' }],
    profile: {
        stageName: 'Mila Novak', countryCode: 'CZ', city: 'Prague', timezone: 'Europe/Prague', relationshipStatus: 'ACTIVE',
        bioShort: 'Prague based choreographer mixing heels with contemporary.', instagramUrl: 'https://instagram.com/demo.mila',
        styles: ['Heels', 'Contemporary'], languages: ['Czech', 'English', 'German'],
    },
    bios: [{ locale: 'en', kind: 'SHORT', content: 'Prague based choreographer mixing heels with contemporary. (Demo text.)' }],
    contacts: [agencyContact],
    assignments: [
        {
            event: '2026', status: 'COMPLETED', roleTitle: 'Choreographer', travelStatus: 'BOOKED', hotelStatus: 'BOOKED',
            fees: [{ status: 'AGREED', amount: '1800', currency: 'EUR' }],
            expenses: [{ category: 'TRAVEL', description: 'Train Prague - Amsterdam', currency: 'EUR', actualAmount: '210' }],
            documents: [{ key: 'mila-invoice-2026', type: 'INVOICE', title: 'Invoice 2026-031', invoiceStatus: 'RECEIVED', invoiceNumber: '2026-031', issuerName: 'Mila Novak (demo)', amount: '1800', currency: 'EUR', lines: ['Invoice 2026-031', 'Teaching fee HHDC 2026: EUR 1800.00', 'Demonstration content.'] }],
            payments: [
                { type: 'ADVANCE', amount: '600', currency: 'EUR', reference: 'Advance', confirmedOn: '2026-06-01', invoice: 'mila-invoice-2026' },
                { type: 'FEE', amount: '1200', currency: 'EUR', reference: 'Balance, not sent yet', invoice: 'mila-invoice-2026' },
            ],
        },
        {
            event: '2027', status: 'CONFIRMED', roleTitle: 'Choreographer', travelStatus: 'PENDING', hotelStatus: 'BOOKED',
            fees: [{ status: 'AGREED', amount: '2400', currency: 'USD', notes: 'Agreed in dollars at the agency request.' }],
        },
    ],
    notes: [{ content: 'Balance for 2026 is still open - check with finance before the 2027 contract goes out.', isPinned: true }],
    tasks: [{ title: 'Pay the 2026 balance', priority: 'HIGH', dueInDays: 0 }],
};

const dario: ChoreographerSeed = {
    key: 'dario', firstName: 'Dario', lastName: 'Conti', email: address('dario.conti'), hue: 25,
    photos: [{ caption: 'Portrait', rightsStatus: 'UNKNOWN' }],
    profile: { stageName: 'Dario Conti', countryCode: 'IT', city: 'Milan', timezone: 'Europe/Rome', relationshipStatus: 'NEGOTIATING', styles: ['Heels', 'Vogue'], languages: ['Italian', 'English'] },
    bios: [{ locale: 'en', kind: 'SHORT', content: 'Milan based choreographer, first time at HHDC if 2027 works out. (Demo text.)' }],
    contacts: [],
    assignments: [{ event: '2027', status: 'INVITED', roleTitle: 'Guest choreographer', fees: [{ status: 'PROPOSED', amount: '1200', currency: 'EUR' }] }],
    notes: [], tasks: [],
};

// A freshly added contact with nothing filled in yet: shows the empty states.
const yuki: ChoreographerSeed = {
    key: 'yuki', firstName: 'Yuki', lastName: 'Tanaka', email: address('yuki.tanaka'), hue: 150, photos: [],
    profile: { countryCode: 'JP', city: 'Tokyo', relationshipStatus: 'CONTACTED' }, bios: [], contacts: [], assignments: [], notes: [], tasks: [],
};

export const CHOREOGRAPHERS: ChoreographerSeed[] = [jojo, mila, dario, yuki];

export interface MessageSeed { from: string; to: string; body: string; daysAgo: number; inbound: boolean; unread?: boolean }
export interface ThreadSeed {
    // Whose conversation it is: a choreographer key, 'agency', or null for a thread nobody owns.
    owner: string | null; event?: EventKey; subject: string; status: 'OPEN' | 'WAITING' | 'RESOLVED'; messages: MessageSeed[];
    // A choreographer the thread is linked to by hand, with the reason.
    linkTo?: { key: string; note: string };
}

const inbound = (from: string, body: string, daysAgo: number, unread = false): MessageSeed => ({ from, to: MAILBOX, body, daysAgo, inbound: true, unread });
const outbound = (to: string, body: string, daysAgo: number): MessageSeed => ({ from: MAILBOX, to, body, daysAgo, inbound: false });

export const THREADS: ThreadSeed[] = [
    {
        owner: 'jojo', event: '2027', subject: 'HHDC 2027 - availability', status: 'OPEN', messages: [
            inbound(jojo.email, 'Hi team! I would love to come back in July 2027. Are the dates fixed already? Jojo', 12),
            outbound(jojo.email, 'Hi Jojo, great to hear! The camp runs 8-11 July 2027. We will send the fee offer to Sam this week.', 11),
            inbound(jojo.email, 'Perfect, those dates work. Could I teach a morning class again?', 1, true),
        ],
    },
    {
        owner: 'jojo', event: '2026', subject: 'Flight details July 2026', status: 'RESOLVED', messages: [
            inbound(jojo.email, 'Attached is my preferred flight: LAX-AMS on 7 July.', 120),
            outbound(jojo.email, 'Booked. The itinerary is in your documents.', 118),
        ],
    },
    {
        owner: 'agency', event: '2027', subject: 'Stage Motion roster for HHDC 2027', status: 'WAITING',
        linkTo: { key: 'jojo', note: 'The agency answers our 2027 fee offer for Jojo in this thread.' },
        messages: [
            inbound(AGENCY.email, 'Hello, regarding HHDC 2027: for Jojo we would like to discuss the fee - 3000 is close, can you include a showcase bonus? Mila is confirmed as agreed. Sam Lee, Stage Motion', 6),
            outbound(AGENCY.email, 'Hi Sam, thank you. We will come back on the showcase bonus by Friday.', 5),
        ],
    },
    {
        owner: null, subject: 'New promo photos (from my private mail)', status: 'OPEN', messages: [
            inbound(address('jojo.private'), 'Sending this from my private address - new promo photos are ready, where should I upload them?', 3, true),
        ],
    },
    {
        owner: 'mila', event: '2026', subject: 'Invoice 2026-031', status: 'WAITING', messages: [
            inbound(mila.email, 'Hi, please find my invoice 2026-031 for the camp. The advance is already deducted on your side I believe.', 60),
            outbound(mila.email, 'Thanks Mila, received. The balance will follow.', 59),
            inbound(mila.email, 'Just checking in on the remaining balance.', 4, true),
        ],
    },
];
