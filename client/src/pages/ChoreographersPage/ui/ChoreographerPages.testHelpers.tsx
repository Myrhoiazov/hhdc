import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import {
    addBioVersion,
    assignChoreographerToEvent,
    addChoreographerNote,
    addChoreographerTask,
    listChoreographerNotes,
    listChoreographerTasks,
    removeChoreographerNote,
    updateChoreographerNote,
    linkChoreographerThread,
    listChoreographerActivity,
    listChoreographerThreads,
    unlinkChoreographerThread,
    movePayout,
    recordChoreographerExpense,
    recordFeeAgreement,
    recordPayout,
    ChoreographerContact,
    ChoreographerHistoryItem,
    listChoreographerHistory,
    updateChoreographerAssignment,
    ChoreographerDetail,
    ChoreographerPhoto,
    createChoreographer,
    createChoreographerContact,
    deactivateChoreographerContact,
    fetchChoreographerPhoto,
    getChoreographer,
    listBioVersions,
    listChoreographerContacts,
    listChoreographerPhotos,
    listChoreographers,
    removeChoreographerPhoto,
    reorderChoreographerPhotos,
    updateChoreographer,
    updateChoreographerPhoto,
    uploadChoreographerPhoto,
} from '@/entities/Choreographer';
import { listConversations } from '@/entities/Conversation';
import { listEvents } from '@/entities/Event';
import { listPeople } from '@/entities/Person';
import {
    openDocumentFile,
    listChoreographerDocuments,
    listEventDocuments,
    updateDocumentMetadata,
    uploadChoreographerDocument,
    uploadDocumentVersion,
} from '@/entities/Document';
import { updateTaskStatus } from '@/entities/Operations';
import { ChoreographerPage } from './profile/ChoreographerPage';
import { ChoreographersPage } from './list/ChoreographersPage';

// Shared by the choreographer page tests: the mocked entities (mocked here, so a test file must
// import this module before anything it mocks), the fixtures and the default answers of the requests.
jest.mock('@/entities/Choreographer', () => ({
    ...jest.requireActual('@/entities/Choreographer'),
    RELATIONSHIP_STATUSES: [
        'NEW',
        'CONTACTED',
        'NEGOTIATING',
        'ACTIVE',
        'RETURNING',
        'INACTIVE',
        'DO_NOT_CONTACT',
    ],
    CHOREOGRAPHER_PAGE_SIZE: 25,
    listChoreographers: jest.fn(),
    getChoreographer: jest.fn(),
    createChoreographer: jest.fn(),
    updateChoreographer: jest.fn(),
    BIO_KINDS: ['SHORT', 'FULL', 'PROMO'],
    CONTACT_KINDS: ['SELF_SECONDARY', 'MANAGER', 'AGENT', 'ASSISTANT', 'ACCOUNTING', 'OTHER'],
    MEDIA_RIGHTS: ['UNKNOWN', 'PERMITTED', 'RESTRICTED'],
    MAX_CHOREOGRAPHER_PHOTOS: 10,
    MAX_PHOTO_BYTES: 10 * 1024 * 1024,
    listBioVersions: jest.fn(),
    addBioVersion: jest.fn(),
    listChoreographerContacts: jest.fn(),
    createChoreographerContact: jest.fn(),
    updateChoreographerContact: jest.fn(),
    deactivateChoreographerContact: jest.fn(),
    listChoreographerPhotos: jest.fn(),
    uploadChoreographerPhoto: jest.fn(),
    updateChoreographerPhoto: jest.fn(),
    reorderChoreographerPhotos: jest.fn(),
    removeChoreographerPhoto: jest.fn(),
    fetchChoreographerPhoto: jest.fn(),
    ASSIGNMENT_STATUSES: ['INVITED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
    LOGISTICS_STATUSES: ['NOT_REQUIRED', 'PENDING', 'BOOKED', 'CANCELLED'],
    listChoreographerHistory: jest.fn(),
    assignChoreographerToEvent: jest.fn(),
    updateChoreographerAssignment: jest.fn(),
    FEE_STATUSES: ['PROPOSED', 'COUNTERED', 'AGREED'],
    EXPENSE_CATEGORIES: ['TRAVEL', 'HOTEL', 'PER_DIEM', 'TRANSFER', 'EQUIPMENT', 'OTHER'],
    EXPENSE_PAYERS: ['ORGANIZER', 'CHOREOGRAPHER', 'OTHER'],
    PAYOUT_TYPES: ['ADVANCE', 'FEE', 'REIMBURSEMENT', 'OTHER'],
    getChoreographerFinance: jest.fn(),
    recordFeeAgreement: jest.fn(),
    cancelFeeAgreement: jest.fn(),
    recordChoreographerExpense: jest.fn(),
    cancelChoreographerExpense: jest.fn(),
    recordPayout: jest.fn(),
    movePayout: jest.fn(),
    listChoreographerThreads: jest.fn(),
    linkChoreographerThread: jest.fn(),
    unlinkChoreographerThread: jest.fn(),
    listChoreographerActivity: jest.fn(),
    TASK_PRIORITIES: ['LOW', 'NORMAL', 'HIGH'],
    listChoreographerNotes: jest.fn(),
    addChoreographerNote: jest.fn(),
    updateChoreographerNote: jest.fn(),
    removeChoreographerNote: jest.fn(),
    listChoreographerTasks: jest.fn(),
    addChoreographerTask: jest.fn(),
}));
jest.mock('@/entities/Person', () => ({
    ...jest.requireActual('@/entities/Person'),
    listPeople: jest.fn(),
}));
jest.mock('@/entities/Event', () => ({ listEvents: jest.fn() }));
jest.mock('@/entities/Conversation', () => ({ listConversations: jest.fn() }));
jest.mock('@/entities/Document', () => ({
    ...jest.requireActual('@/entities/Document'),
    DOCUMENT_TYPES: ['CONTRACT', 'INVOICE', 'RIDER', 'TRAVEL', 'HOTEL', 'OTHER'],
    CONTRACT_STATUSES: ['DRAFT', 'READY', 'SENT', 'SIGNED', 'EXPIRED', 'CANCELLED'],
    INVOICE_STATUSES: [
        'RECEIVED',
        'REVIEWED',
        'APPROVED',
        'PARTIALLY_PAID',
        'PAID',
        'CANCELLED',
        'DISPUTED',
    ],
    MAX_DOCUMENT_BYTES: 20 * 1024 * 1024,
    listChoreographerDocuments: jest.fn(),
    listEventDocuments: jest.fn(),
    uploadChoreographerDocument: jest.fn(),
    uploadDocumentVersion: jest.fn(),
    updateDocumentMetadata: jest.fn(),
    openDocumentFile: jest.fn(),
}));
jest.mock('@/entities/Operations', () => ({ updateTaskStatus: jest.fn() }));

export const person = {
    id: 'person-1',
    firstName: 'Joanna',
    lastName: 'Gomez',
    displayName: 'Joanna Gomez',
    email: 'jojo@example.test',
    phone: null,
    country: 'US',
    language: 'en',
    status: 'ACTIVE',
};
export const profile = {
    stageName: 'Jojo Gomez',
    bioShort: null,
    bioFull: 'Heels choreographer from LA.',
    countryCode: 'US',
    city: 'Los Angeles',
    timezone: null,
    relationshipStatus: 'ACTIVE' as const,
    websiteUrl: null,
    instagramUrl: 'https://instagram.com/jojo',
    tiktokUrl: null,
    youtubeUrl: null,
    styles: ['heels'],
    languages: ['en'],
    updatedAt: '2026-10-08T10:00:00.000Z',
};
export const summary = {
    totalAssignments: 2,
    lastEventYear: 2026,
    upcomingEvent: { id: 'event-27', name: 'HHDC 2027', startAt: '2027-05-21T08:00:00.000Z' },
    openTasks: 1,
};
export const detail: ChoreographerDetail = {
    person,
    profile,
    summary,
    coverPhotoId: null,
    checklist: ['styles'],
    assignments: [
        {
            id: 'assignment-1',
            status: 'CONFIRMED',
            roleTitle: 'Choreographer',
            event: {
                id: 'event-27',
                name: 'HHDC 2027',
                startAt: '2027-05-21T08:00:00.000Z',
                endAt: '2027-05-23T20:00:00.000Z',
            },
        },
    ],
};

export const renderAt = (path: string, permissions: string[]) => {
    const store = createReduxStore({
        user: {
            authData: { id: 'user-1', name: 'Staff', email: 'staff@example.test', permissions },
            _inited: true,
        },
    } as never) as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/people/choreographers" element={<ChoreographersPage />} />
                    <Route path="/people/choreographers/:id" element={<ChoreographerPage />} />
                    <Route path="/people/choreographers/:id/:tab" element={<ChoreographerPage />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
};

// The profile itself, its biography, contacts, photos, events and fees.
export const mockProfileRequests = () => {
    jest.mocked(listChoreographers).mockReset();
    jest.mocked(listChoreographers).mockResolvedValue({
        data: [{ person, profile, summary, coverPhotoId: null }],
        total: 1,
    });
    jest.mocked(getChoreographer).mockResolvedValue(detail);
    jest.mocked(listPeople).mockResolvedValue({ data: [], total: 0 });
    jest.mocked(updateChoreographer).mockReset();
    jest.mocked(updateChoreographer).mockResolvedValue(detail);
    jest.mocked(createChoreographer).mockReset();
    jest.mocked(createChoreographer).mockResolvedValue(detail);
    jest.mocked(listBioVersions).mockResolvedValue([]);
    jest.mocked(listChoreographerContacts).mockResolvedValue([]);
    jest.mocked(listChoreographerPhotos).mockResolvedValue([]);
    jest.mocked(fetchChoreographerPhoto).mockResolvedValue(new Blob(['x']));
    for (const mock of [
        addBioVersion,
        createChoreographerContact,
        deactivateChoreographerContact,
        uploadChoreographerPhoto,
        updateChoreographerPhoto,
        reorderChoreographerPhotos,
        removeChoreographerPhoto,
    ]) {
        jest.mocked(mock).mockReset();
        jest.mocked(mock).mockResolvedValue(undefined as never);
    }
    jest.mocked(listChoreographerHistory).mockResolvedValue([]);
    jest.mocked(listEvents).mockResolvedValue({ data: [], total: 0 });
    for (const mock of [assignChoreographerToEvent, updateChoreographerAssignment]) {
        jest.mocked(mock).mockReset();
        jest.mocked(mock).mockResolvedValue({ id: 'assignment-x' });
    }
    for (const mock of [recordFeeAgreement, recordChoreographerExpense, recordPayout, movePayout]) {
        jest.mocked(mock).mockReset();
        jest.mocked(mock).mockResolvedValue({} as never);
    }
};

// Documents, conversations, activity, notes and follow-ups, and what the browser gives a download.
export const mockRecordRequests = () => {
    jest.mocked(listChoreographerDocuments).mockResolvedValue([]);
    jest.mocked(listEventDocuments).mockResolvedValue([]);
    jest.mocked(openDocumentFile).mockResolvedValue(undefined);
    for (const mock of [
        uploadChoreographerDocument,
        uploadDocumentVersion,
        updateDocumentMetadata,
    ]) {
        jest.mocked(mock).mockReset();
        jest.mocked(mock).mockResolvedValue({} as never);
    }
    jest.mocked(listChoreographerThreads).mockResolvedValue({ data: [], candidates: [], total: 0 });
    jest.mocked(listConversations).mockResolvedValue({ data: [], total: 0 });
    jest.mocked(listChoreographerActivity).mockReset();
    jest.mocked(listChoreographerActivity).mockResolvedValue({ data: [], nextBefore: null });
    for (const mock of [linkChoreographerThread, unlinkChoreographerThread]) {
        jest.mocked(mock).mockReset();
        jest.mocked(mock).mockResolvedValue({} as never);
    }
    jest.mocked(listChoreographerNotes).mockResolvedValue([]);
    jest.mocked(listChoreographerTasks).mockReset();
    jest.mocked(listChoreographerTasks).mockResolvedValue([]);
    for (const mock of [
        addChoreographerNote,
        updateChoreographerNote,
        removeChoreographerNote,
        addChoreographerTask,
        updateTaskStatus,
    ]) {
        jest.mocked(mock).mockReset();
        jest.mocked(mock).mockResolvedValue({} as never);
    }
    window.open = jest.fn();
    URL.createObjectURL = jest.fn(() => 'blob:photo');
    URL.revokeObjectURL = jest.fn();
};

export const ALL = [
    'choreographers.read',
    'choreographers.update',
    'choreographers.events.manage',
    'choreographers.contacts.read',
    'choreographers.contacts.manage',
    'choreographers.media.manage',
];
export const manager: ChoreographerContact = {
    id: 'contact-1',
    kind: 'MANAGER',
    name: 'Sam Lee',
    organization: 'Agency',
    email: 'sam@agency.test',
    phone: null,
    preferredChannel: null,
    isPrimary: false,
    isActive: true,
    validFrom: null,
    validTo: null,
    notes: null,
};
export const photo = (id: string, position: number, isCover = false): ChoreographerPhoto => ({
    id,
    position,
    isCover,
    caption: null,
    credit: null,
    rightsStatus: 'UNKNOWN',
    rightsNotes: null,
    width: 1200,
    height: 800,
});

// Every test starts from the default answers of the requests.
export const answerChoreographerRequests = () => {
    beforeEach(() => {
        mockProfileRequests();
        mockRecordRequests();
    });
};

export const historyItem = (
    id: string,
    name: string,
    year: number,
    timing: ChoreographerHistoryItem['timing']
): ChoreographerHistoryItem => ({
    id,
    status: 'CONFIRMED',
    roleTitle: 'Choreographer',
    travelStatus: 'PENDING',
    hotelStatus: 'PENDING',
    notes: null,
    year,
    timing,
    event: {
        id: `event-${year}`,
        name,
        status: 'PUBLISHED',
        startAt: `${year}-05-21T08:00:00.000Z`,
        endAt: `${year}-05-23T20:00:00.000Z`,
        city: 'Amsterdam',
    },
    sessions:
        year === 2027 ? [{ id: 's1', name: 'Heels Pro', startAt: '2027-05-21T10:00:00.000Z' }] : [],
});
