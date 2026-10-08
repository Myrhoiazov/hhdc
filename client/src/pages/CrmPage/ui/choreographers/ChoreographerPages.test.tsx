import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import {
    addBioVersion, assignChoreographerToEvent, ChoreographerFinance, addChoreographerNote, addChoreographerTask, ChoreographerTask, listChoreographerNotes,
    listChoreographerTasks, removeChoreographerNote, updateChoreographerNote, updateTaskStatus, ChoreographerThread, linkChoreographerThread, listChoreographerActivity,
    listChoreographerThreads, listConversations, unlinkChoreographerThread, fetchDocumentFile, FileDocument, listChoreographerDocuments, listEventDocuments,
    updateDocumentMetadata, uploadChoreographerDocument, uploadDocumentVersion, getChoreographerFinance, movePayout, recordChoreographerExpense, recordFeeAgreement, recordPayout, ChoreographerContact, ChoreographerHistoryItem, listChoreographerHistory, listEvents, updateChoreographerAssignment, ChoreographerDetail, ChoreographerPhoto, createChoreographer, createChoreographerContact,
    deactivateChoreographerContact, fetchChoreographerPhoto, getChoreographer, listBioVersions, listChoreographerContacts, listChoreographerPhotos,
    listChoreographers, listPeople, removeChoreographerPhoto, reorderChoreographerPhotos, updateChoreographer, updateChoreographerPhoto,
    uploadChoreographerPhoto,
} from '@/entities/crm';
import { ChoreographerPage } from './ChoreographerPage';
import { ChoreographersPage } from './ChoreographersPage';
import { EventDocuments } from './EventDocuments';
import { groupByYear } from './EventsTab';
import { dueAtEndOfDay, isOverdue } from './NotesTab';
import { payoutActions } from './FinanceTab';
import { movePhoto, photoProblem } from './MediaTab';

jest.mock('@/entities/crm', () => ({
    RELATIONSHIP_STATUSES: ['NEW', 'CONTACTED', 'NEGOTIATING', 'ACTIVE', 'RETURNING', 'INACTIVE', 'DO_NOT_CONTACT'],
    CHOREOGRAPHER_PAGE_SIZE: 25,
    listChoreographers: jest.fn(),
    getChoreographer: jest.fn(),
    createChoreographer: jest.fn(),
    updateChoreographer: jest.fn(),
    listPeople: jest.fn(),
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
    listEvents: jest.fn(),
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
    DOCUMENT_TYPES: ['CONTRACT', 'INVOICE', 'RIDER', 'TRAVEL', 'HOTEL', 'OTHER'],
    CONTRACT_STATUSES: ['DRAFT', 'READY', 'SENT', 'SIGNED', 'EXPIRED', 'CANCELLED'],
    INVOICE_STATUSES: ['RECEIVED', 'REVIEWED', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'DISPUTED'],
    MAX_DOCUMENT_BYTES: 20 * 1024 * 1024,
    listChoreographerDocuments: jest.fn(),
    listEventDocuments: jest.fn(),
    uploadChoreographerDocument: jest.fn(),
    uploadDocumentVersion: jest.fn(),
    updateDocumentMetadata: jest.fn(),
    fetchDocumentFile: jest.fn(),
    listChoreographerThreads: jest.fn(),
    linkChoreographerThread: jest.fn(),
    unlinkChoreographerThread: jest.fn(),
    listConversations: jest.fn(),
    listChoreographerActivity: jest.fn(),
    TASK_PRIORITIES: ['LOW', 'NORMAL', 'HIGH'],
    listChoreographerNotes: jest.fn(),
    addChoreographerNote: jest.fn(),
    updateChoreographerNote: jest.fn(),
    removeChoreographerNote: jest.fn(),
    listChoreographerTasks: jest.fn(),
    addChoreographerTask: jest.fn(),
    updateTaskStatus: jest.fn(),
}), { virtual: true });

const person = { id: 'person-1', firstName: 'Joanna', lastName: 'Gomez', displayName: 'Joanna Gomez', email: 'jojo@example.test', phone: null, country: 'US', language: 'en', status: 'ACTIVE' };
const profile = {
    stageName: 'Jojo Gomez', bioShort: null, bioFull: 'Heels choreographer from LA.', countryCode: 'US', city: 'Los Angeles', timezone: null,
    relationshipStatus: 'ACTIVE' as const, websiteUrl: null, instagramUrl: 'https://instagram.com/jojo', tiktokUrl: null, youtubeUrl: null,
    styles: ['heels'], languages: ['en'], updatedAt: '2026-10-08T10:00:00.000Z',
};
const summary = { totalAssignments: 2, lastEventYear: 2026, upcomingEvent: { id: 'event-27', name: 'HHDC 2027', startAt: '2027-05-21T08:00:00.000Z' }, openTasks: 1 };
const detail: ChoreographerDetail = {
    person, profile, summary, checklist: ['styles'],
    assignments: [{ id: 'assignment-1', status: 'CONFIRMED', roleTitle: 'Choreographer', event: { id: 'event-27', name: 'HHDC 2027', startAt: '2027-05-21T08:00:00.000Z', endAt: '2027-05-23T20:00:00.000Z' } }],
};

const renderAt = (path: string, permissions: string[]) => {
    const store = createReduxStore({ user: { authData: { id: 'user-1', name: 'Staff', email: 'staff@example.test', permissions }, _inited: true } } as never) as ReduxStoreWithManager;
    return render(<Provider store={store}><MemoryRouter initialEntries={[path]}><Routes>
        <Route path="/people/choreographers" element={<ChoreographersPage />} />
        <Route path="/people/choreographers/:id" element={<ChoreographerPage />} />
        <Route path="/people/choreographers/:id/:tab" element={<ChoreographerPage />} />
    </Routes></MemoryRouter></Provider>);
};

beforeEach(() => {
    jest.mocked(listChoreographers).mockReset();
    jest.mocked(listChoreographers).mockResolvedValue({ data: [{ person, profile, summary }], total: 1 });
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
    for (const mock of [addBioVersion, createChoreographerContact, deactivateChoreographerContact, uploadChoreographerPhoto, updateChoreographerPhoto, reorderChoreographerPhotos, removeChoreographerPhoto]) {
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
    jest.mocked(listChoreographerDocuments).mockResolvedValue([]);
    jest.mocked(listEventDocuments).mockResolvedValue([]);
    jest.mocked(fetchDocumentFile).mockResolvedValue(new Blob(['%PDF']));
    for (const mock of [uploadChoreographerDocument, uploadDocumentVersion, updateDocumentMetadata]) {
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
    for (const mock of [addChoreographerNote, updateChoreographerNote, removeChoreographerNote, addChoreographerTask, updateTaskStatus]) {
        jest.mocked(mock).mockReset();
        jest.mocked(mock).mockResolvedValue({} as never);
    }
    window.open = jest.fn();
    URL.createObjectURL = jest.fn(() => 'blob:photo');
    URL.revokeObjectURL = jest.fn();
});

const ALL = ['choreographers.read', 'choreographers.update', 'choreographers.events.manage', 'choreographers.contacts.read', 'choreographers.contacts.manage', 'choreographers.media.manage'];
const manager: ChoreographerContact = {
    id: 'contact-1', kind: 'MANAGER', name: 'Sam Lee', organization: 'Agency', email: 'sam@agency.test', phone: null, preferredChannel: null,
    isPrimary: false, isActive: true, validFrom: null, validTo: null, notes: null,
};
const photo = (id: string, position: number, isCover = false): ChoreographerPhoto => ({ id, position, isCover, caption: null, credit: null, rightsStatus: 'UNKNOWN', rightsNotes: null, width: 1200, height: 800 });

test('the list shows stage name, legal name and collaboration summary, and filters by relationship', async () => {
    renderAt('/people/choreographers', ['choreographers.read']);

    const link = await screen.findByRole('link', { name: 'Jojo Gomez' });
    expect(link).toHaveAttribute('href', '/people/choreographers/person-1');
    expect(screen.getByText('Joanna Gomez')).toBeInTheDocument();
    expect(screen.getByText('Events: 2')).toBeInTheDocument();
    expect(screen.getByText('Last event: 2026')).toBeInTheDocument();
    expect(screen.getByText('Upcoming: HHDC 2027')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Relationship'), { target: { value: 'NEGOTIATING' } });

    await waitFor(() => expect(listChoreographers).toHaveBeenLastCalledWith({ q: '', relationshipStatus: 'NEGOTIATING' }, 1));
    expect(screen.queryByRole('region', { name: 'Add choreographer' })).not.toBeInTheDocument();
});

test('a choreographer is created from an existing contact, never as a new person', async () => {
    jest.mocked(listPeople).mockImplementation(async (search) => (search === 'ali'
        ? { data: [{ id: 'person-2', firstName: 'Aliya', lastName: 'Janell', displayName: 'Aliya Janell', email: 'aliya@example.test', status: 'ACTIVE', roles: [] }], total: 1 }
        : { data: [], total: 0 }));
    renderAt('/people/choreographers', ['choreographers.read', 'choreographers.create']);

    fireEvent.change(await screen.findByLabelText('Find contact'), { target: { value: 'ali' } });
    await screen.findByRole('option', { name: 'Aliya Janell · aliya@example.test' });
    fireEvent.change(screen.getByLabelText('Contact'), { target: { value: 'person-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create choreographer profile' }));

    await waitFor(() => expect(createChoreographer).toHaveBeenCalledWith('person-2'));
});

test('the profile shows the header summary, events and what is still missing', async () => {
    renderAt('/people/choreographers/person-1', ['choreographers.read']);

    expect(await screen.findByRole('heading', { name: 'Jojo Gomez' })).toBeInTheDocument();
    expect(screen.getByText('Los Angeles, US')).toBeInTheDocument();
    expect(screen.getByText('Open tasks: 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'HHDC 2027' })).toHaveAttribute('href', '/events/event-27');
    expect(screen.getByRole('list', { name: 'Missing from the profile' })).toHaveTextContent('Dance styles');
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
});

test('the biography tab is route-addressable and saves normalised lists', async () => {
    renderAt('/people/choreographers/person-1/biography', ['choreographers.read', 'choreographers.update']);

    const styles = await screen.findByLabelText('Dance styles (comma separated)');
    expect(screen.getByLabelText('Stage name')).toHaveValue('Jojo Gomez');
    fireEvent.change(styles, { target: { value: 'heels, frame up' } });
    fireEvent.change(screen.getByLabelText('Relationship'), { target: { value: 'RETURNING' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateChoreographer).toHaveBeenCalledWith('person-1', expect.objectContaining({
        stageName: 'Jojo Gomez', styles: ['heels', 'frame up'], relationshipStatus: 'RETURNING', instagramUrl: 'https://instagram.com/jojo', websiteUrl: '',
    })));
    await waitFor(() => expect(getChoreographer).toHaveBeenCalledTimes(2));
});

test('without the update permission the biography is read-only', async () => {
    renderAt('/people/choreographers/person-1/biography', ['choreographers.read']);

    expect(await screen.findByText('Heels choreographer from LA.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://instagram.com/jojo' })).toHaveAttribute('rel', 'noreferrer noopener');
});

test('tabs are offered by permission, and a tab the user may not read falls back to the overview', async () => {
    renderAt('/people/choreographers/person-1/contacts', ['choreographers.read']);

    expect(await screen.findByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Photos' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Contacts' })).not.toBeInTheDocument();
    expect(listChoreographerContacts).not.toHaveBeenCalled();
});

test('a manager contact is added and a former one is deactivated, not deleted', async () => {
    jest.mocked(listChoreographerContacts).mockResolvedValue([manager]);
    renderAt('/people/choreographers/person-1/contacts', ALL);

    expect(await screen.findByText('Sam Lee')).toBeInTheDocument();
    expect(screen.getByText('MANAGER · Agency')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Contact type'), { target: { value: 'ACCOUNTING' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bills@agency.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add contact' }));
    await waitFor(() => expect(createChoreographerContact).toHaveBeenCalledWith('person-1', expect.objectContaining({ kind: 'ACCOUNTING', email: 'bills@agency.test', isPrimary: false })));

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(deactivateChoreographerContact).toHaveBeenCalledWith('person-1', 'contact-1'));
});

test('photos are uploaded one by one, reordered, and one can be made the cover', async () => {
    jest.mocked(listChoreographerPhotos).mockResolvedValue([photo('p1', 0, true), photo('p2', 1)]);
    renderAt('/people/choreographers/person-1/media', ALL);

    expect(await screen.findByText('2 / 10')).toBeInTheDocument();
    await waitFor(() => expect(fetchChoreographerPhoto).toHaveBeenCalledWith('person-1', 'p1', 'thumb'));
    const file = new File(['img'], 'stage.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText(/Upload photos/), { target: { files: [file] } });
    await waitFor(() => expect(uploadChoreographerPhoto).toHaveBeenCalledWith('person-1', file));

    fireEvent.click(await screen.findByRole('button', { name: 'Photo 2: Move earlier' }));
    await waitFor(() => expect(reorderChoreographerPhotos).toHaveBeenCalledWith('person-1', ['p2', 'p1']));
    fireEvent.click(await screen.findByRole('button', { name: 'Photo 2: Make cover' }));
    await waitFor(() => expect(updateChoreographerPhoto).toHaveBeenCalledWith('person-1', 'p2', { isCover: true }));
});

test('a file that cannot be a photo is refused before any upload', async () => {
    renderAt('/people/choreographers/person-1/media', ALL);

    await screen.findByText('0 / 10');
    fireEvent.change(screen.getByLabelText(/Upload photos/), { target: { files: [new File(['x'], 'contract.pdf', { type: 'application/pdf' })] } });

    expect(await screen.findByRole('alert')).toHaveTextContent('contract.pdf: Only JPEG, PNG and WebP photos are accepted');
    expect(uploadChoreographerPhoto).not.toHaveBeenCalled();
});

test('photo rules: the tenth photo is the last, and moving stays inside the list', () => {
    const jpeg = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    expect(photoProblem(jpeg, 9)).toBe('');
    expect(photoProblem(jpeg, 10)).toBe('A choreographer can have at most 10 photos');
    expect(movePhoto(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b']);
    expect(movePhoto(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
});

test('without the media permission photos are shown without controls', async () => {
    jest.mocked(listChoreographerPhotos).mockResolvedValue([photo('p1', 0, true)]);
    renderAt('/people/choreographers/person-1/media', ['choreographers.read']);

    expect(await screen.findByText('Cover')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Upload photos/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
});

test('a biography variant is saved as a new version and earlier versions are counted', async () => {
    jest.mocked(listBioVersions).mockResolvedValue([
        { id: 'bio-2', locale: 'nl', kind: 'PROMO', content: 'Nieuwe tekst', version: 2, isCurrent: true, createdAt: '2026-10-08T10:00:00.000Z' },
        { id: 'bio-1', locale: 'nl', kind: 'PROMO', content: 'Oude tekst', version: 1, isCurrent: false, createdAt: '2026-10-01T10:00:00.000Z' },
    ]);
    renderAt('/people/choreographers/person-1/biography', ALL);

    const variant = await screen.findByRole('article', { name: 'NL · BIO_PROMO' });
    expect(variant).toHaveTextContent('Nieuwe tekst');
    expect(variant).toHaveTextContent('Earlier versions: 1');
    expect(screen.queryByText('Oude tekst')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Language code'), { target: { value: 'ru' } });
    fireEvent.change(screen.getByLabelText('Variant text'), { target: { value: 'Текст на русском' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save as new version' }));

    await waitFor(() => expect(addBioVersion).toHaveBeenCalledWith('person-1', { locale: 'ru', kind: 'PROMO', content: 'Текст на русском' }));
});

const historyItem = (id: string, name: string, year: number, timing: ChoreographerHistoryItem['timing']): ChoreographerHistoryItem => ({
    id, status: 'CONFIRMED', roleTitle: 'Choreographer', travelStatus: 'PENDING', hotelStatus: 'PENDING', notes: null, year, timing,
    event: { id: `event-${year}`, name, status: 'PUBLISHED', startAt: `${year}-05-21T08:00:00.000Z`, endAt: `${year}-05-23T20:00:00.000Z`, city: 'Amsterdam' },
    sessions: year === 2027 ? [{ id: 's1', name: 'Heels Pro', startAt: '2027-05-21T10:00:00.000Z' }] : [],
});

test('the event history is grouped by year and shows the same assignment the event page links to', async () => {
    jest.mocked(listChoreographerHistory).mockResolvedValue([historyItem('a27', 'HHDC 2027', 2027, 'UPCOMING'), historyItem('a26', 'HHDC 2026', 2026, 'PAST')]);
    renderAt('/people/choreographers/person-1/events', ['choreographers.read']);

    const upcoming = await screen.findByRole('article', { name: 'HHDC 2027' });
    expect(screen.getByRole('region', { name: '2027' })).toContainElement(upcoming);
    expect(screen.getByRole('region', { name: '2026' })).toHaveTextContent('HHDC 2026');
    expect(upcoming).toHaveTextContent('Sessions: Heels Pro');
    expect(upcoming).toHaveTextContent('TIMING_UPCOMING');
    expect(screen.getByRole('link', { name: 'HHDC 2027' })).toHaveAttribute('href', '/events/event-2027');
    expect(screen.queryByRole('form', { name: 'Add to event' })).not.toBeInTheDocument();
});

test('a choreographer is added to an event they are not on yet, and logistics are updated in place', async () => {
    jest.mocked(listChoreographerHistory).mockResolvedValue([historyItem('a27', 'HHDC 2027', 2027, 'UPCOMING')]);
    jest.mocked(listEvents).mockResolvedValue({ data: [
        { id: 'event-2027', name: 'HHDC 2027' }, { id: 'event-2025', name: 'HHDC 2025' },
    ] as never, total: 2 });
    renderAt('/people/choreographers/person-1/events', ALL);

    await screen.findByRole('option', { name: 'HHDC 2025' });
    expect(screen.queryByRole('option', { name: 'HHDC 2027' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Event'), { target: { value: 'event-2025' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to event' }));
    await waitFor(() => expect(assignChoreographerToEvent).toHaveBeenCalledWith('person-1', { eventId: 'event-2025', roleTitle: undefined, status: 'INVITED' }));

    fireEvent.change(screen.getByLabelText('Travel'), { target: { value: 'BOOKED' } });
    await waitFor(() => expect(updateChoreographerAssignment).toHaveBeenCalledWith('person-1', 'a27', { travelStatus: 'BOOKED' }));
});

test('years are grouped newest first', () => {
    const groups = groupByYear([historyItem('a', 'A', 2025, 'PAST'), historyItem('b', 'B', 2027, 'UPCOMING'), historyItem('c', 'C', 2025, 'PAST')]);
    expect(groups.map(([year, items]) => [year, items.length])).toEqual([[2027, 1], [2025, 2]]);
});

const eurTotals = { currency: 'EUR', agreedFee: '2500.00', estimatedExpenses: '300.00', actualExpenses: '680.00', confirmedPayments: '500.00', outstandingFee: '2000.00', organizerTotalCost: '3180.00' };
const finance: ChoreographerFinance = {
    years: [{ year: 2026, totals: [eurTotals, { ...eurTotals, currency: 'USD', agreedFee: null, outstandingFee: null, actualExpenses: '200.00' }] }],
    assignments: [{
        id: 'assignment-26', roleTitle: 'Choreographer', status: 'COMPLETED', year: 2026, event: { id: 'event-2026', name: 'HHDC 2026', startAt: '2026-05-15T08:00:00.000Z' },
        totals: [eurTotals],
        agreements: [
            { id: 'fee-3', status: 'AGREED', amount: '2500', currency: 'EUR', feeBasis: 'EVENT', scopeDescription: null, notes: null, createdAt: '2026-02-01T10:00:00.000Z' },
            { id: 'fee-1', status: 'PROPOSED', amount: '2000', currency: 'EUR', feeBasis: 'EVENT', scopeDescription: null, notes: 'First offer', createdAt: '2026-01-10T10:00:00.000Z' },
        ],
        expenses: [{ id: 'exp-1', type: 'HOTEL', description: null, currency: 'EUR', estimatedAmount: null, actualAmount: '280', paidBy: 'ORGANIZER', reimbursable: false, status: 'PAID', expenseDate: null }],
        payments: [
            { id: 'pay-1', type: 'ADVANCE', amount: '500', currency: 'EUR', status: 'CONFIRMED', paymentDate: '2026-03-01', reference: null },
            { id: 'pay-2', type: 'FEE', amount: '2000', currency: 'EUR', status: 'PENDING', paymentDate: null, reference: null },
        ],
    }],
};
const FINANCE = [...ALL, 'choreographers.finance.read', 'choreographers.finance.write'];

test('the finance tab keeps currencies apart and shows the negotiation, expenses and payments of each event', async () => {
    jest.mocked(getChoreographerFinance).mockResolvedValue(finance);
    renderAt('/people/choreographers/person-1/finance', FINANCE);

    const year = await screen.findByRole('region', { name: 'Finance 2026' });
    expect(year).toHaveTextContent('2500.00 EUR');
    expect(year).toHaveTextContent('200.00 USD');
    const event = screen.getByRole('article', { name: 'HHDC 2026' });
    expect(event).toHaveTextContent('2000 EUR');
    expect(event).toHaveTextContent('First offer');
    expect(event).toHaveTextContent('EXPENSE_HOTEL: 280 EUR');
    expect(event).toHaveTextContent('PAYOUT_ADVANCE: 500 EUR');
});

test('a fee step, an expense and a payment are recorded for the assignment and the ledger is reloaded', async () => {
    jest.mocked(getChoreographerFinance).mockResolvedValue(finance);
    renderAt('/people/choreographers/person-1/finance', FINANCE);

    const fee = await screen.findByRole('form', { name: 'Record fee' });
    fireEvent.change(fee.querySelector('[name="status"]')!, { target: { value: 'AGREED' } });
    fireEvent.change(fee.querySelector('[name="amount"]')!, { target: { value: '2600' } });
    fireEvent.submit(fee);
    await waitFor(() => expect(recordFeeAgreement).toHaveBeenCalledWith('assignment-26', { status: 'AGREED', amount: '2600', currency: 'EUR', notes: '' }));

    const expense = screen.getByRole('form', { name: 'Record expense' });
    fireEvent.change(expense.querySelector('[name="actualAmount"]')!, { target: { value: '400' } });
    fireEvent.submit(expense);
    await waitFor(() => expect(recordChoreographerExpense).toHaveBeenCalledWith('assignment-26', expect.objectContaining({ category: 'TRAVEL', actualAmount: '400', estimatedAmount: null, paidBy: 'ORGANIZER', reimbursable: false })));

    const payment = screen.getByRole('form', { name: 'Record payment' });
    fireEvent.change(payment.querySelector('[name="amount"]')!, { target: { value: '2000' } });
    fireEvent.submit(payment);
    await waitFor(() => expect(recordPayout).toHaveBeenCalledWith('assignment-26', { type: 'FEE', amount: '2000', currency: 'EUR', status: 'PLANNED', reference: '' }));
    await waitFor(() => expect(getChoreographerFinance).toHaveBeenCalledTimes(4));
});

test('confirming a payment is offered only with its own permission', async () => {
    jest.mocked(getChoreographerFinance).mockResolvedValue(finance);
    const view = renderAt('/people/choreographers/person-1/finance', FINANCE);

    await screen.findByRole('article', { name: 'HHDC 2026' });
    expect(screen.queryByRole('button', { name: 'MOVE_CONFIRMED: 2000 EUR' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'MOVE_FAILED: 2000 EUR' })).toBeInTheDocument();
    view.unmount();

    renderAt('/people/choreographers/person-1/finance', [...FINANCE, 'choreographers.payments.confirm']);
    fireEvent.click(await screen.findByRole('button', { name: 'MOVE_CONFIRMED: 2000 EUR' }));
    await waitFor(() => expect(movePayout).toHaveBeenCalledWith('pay-2', 'CONFIRMED'));
});

test('without the finance permission the tab does not exist and nothing is requested', async () => {
    renderAt('/people/choreographers/person-1/finance', ALL);

    expect(await screen.findByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Finance' })).not.toBeInTheDocument();
    expect(getChoreographerFinance).not.toHaveBeenCalled();
});

test('payment actions: read-only users get none, and only confirmers may touch a confirmed payment', () => {
    expect(payoutActions('PENDING', { canWrite: false, canConfirm: true })).toEqual([]);
    expect(payoutActions('PLANNED', { canWrite: true, canConfirm: false })).toEqual(['PENDING', 'CANCELLED']);
    expect(payoutActions('CONFIRMED', { canWrite: true, canConfirm: false })).toEqual([]);
    expect(payoutActions('CONFIRMED', { canWrite: true, canConfirm: true })).toEqual(['CANCELLED']);
    expect(payoutActions('CANCELLED', { canWrite: true, canConfirm: true })).toEqual([]);
});

const fileDocument = (overrides: Partial<FileDocument>): FileDocument => ({
    id: 'doc-1', type: 'CONTRACT', title: 'Contract 2026', notes: null, entityId: 'person-1', eventId: 'event-2026', assignmentId: 'assignment-26',
    currentVersion: 2, archivedAt: null, createdAt: '2026-02-01T10:00:00.000Z', event: { id: 'event-2026', name: 'HHDC 2026' },
    contract: { status: 'SENT', sentAt: '2026-02-01T10:00:00.000Z', signedAt: null, expiresAt: null }, invoice: null, paymentEvidence: null,
    versions: [
        { version: 2, originalFilename: 'contract-signed.pdf', mimeType: 'application/pdf', bytes: 2000, createdAt: '2026-02-10T10:00:00.000Z' },
        { version: 1, originalFilename: 'contract.pdf', mimeType: 'application/pdf', bytes: 1800, createdAt: '2026-02-01T10:00:00.000Z' },
    ],
    ...overrides,
});
const invoiceDocument = fileDocument({
    id: 'doc-2', type: 'INVOICE', title: 'Invoice 14', currentVersion: 1, contract: null, paymentEvidence: 'NONE', duplicateOfDocumentId: 'doc-9',
    invoice: { status: 'RECEIVED', invoiceNumber: '14', issuerName: 'Jojo LLC', amount: '2500.00', currency: 'EUR', dueDate: null },
    versions: [{ version: 1, originalFilename: 'invoice.pdf', mimeType: 'application/pdf', bytes: 900, createdAt: '2026-06-01T10:00:00.000Z' }],
});
const DOCS = [...ALL, 'documents.read', 'documents.write'];

test('documents show their version, status and whether an invoice is really paid', async () => {
    jest.mocked(listChoreographerDocuments).mockResolvedValue([fileDocument({}), invoiceDocument]);
    renderAt('/people/choreographers/person-1/documents', DOCS);

    const contract = await screen.findByRole('article', { name: 'Contract 2026' });
    expect(contract).toHaveTextContent('DOCTYPE_CONTRACT · HHDC 2026 · v2');
    const invoice = screen.getByRole('article', { name: 'Invoice 14' });
    expect(invoice).toHaveTextContent('№ 14 · Jojo LLC · 2500.00 EUR · v1');
    expect(invoice).toHaveTextContent('EVIDENCE_NONE');
    expect(invoice).toHaveTextContent('Another invoice has the same issuer and number.');
});

test('a document is opened through the session, an earlier version stays reachable, and the status can be changed', async () => {
    jest.mocked(listChoreographerDocuments).mockResolvedValue([fileDocument({})]);
    renderAt('/people/choreographers/person-1/documents', DOCS);

    fireEvent.click(await screen.findByRole('button', { name: 'Open: Contract 2026' }));
    await waitFor(() => expect(fetchDocumentFile).toHaveBeenCalledWith('doc-1', undefined));
    await waitFor(() => expect(window.open).toHaveBeenCalledWith('blob:photo', '_blank', 'noopener'));
    fireEvent.click(screen.getByRole('button', { name: 'Contract 2026: v1' }));
    await waitFor(() => expect(fetchDocumentFile).toHaveBeenCalledWith('doc-1', 1));

    fireEvent.change(screen.getByLabelText('Status: Contract 2026'), { target: { value: 'SIGNED' } });
    await waitFor(() => expect(updateDocumentMetadata).toHaveBeenCalledWith('doc-1', { contractStatus: 'SIGNED' }));
    const replacement = new File(['%PDF-2'], 'final.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Upload new version: Contract 2026'), { target: { files: [replacement] } });
    await waitFor(() => expect(uploadDocumentVersion).toHaveBeenCalledWith('doc-1', replacement));
});

test('an invoice is uploaded with its details and linked to the event assignment', async () => {
    jest.mocked(listChoreographerHistory).mockResolvedValue([historyItem('a26', 'HHDC 2026', 2026, 'PAST')]);
    renderAt('/people/choreographers/person-1/documents', DOCS);

    const form = await screen.findByRole('form', { name: 'Upload document' });
    const file = new File(['%PDF-1.7'], 'invoice-14.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Document type'), { target: { value: 'INVOICE' } });
    fireEvent.change(screen.getByLabelText('File'), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText('Invoice number'), { target: { value: '14' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '2500' } });
    await screen.findByRole('option', { name: 'HHDC 2026' });
    fireEvent.change(screen.getByLabelText('Event'), { target: { value: 'a26' } });
    fireEvent.submit(form);

    await waitFor(() => expect(uploadChoreographerDocument).toHaveBeenCalledWith('person-1', file, expect.objectContaining({
        type: 'INVOICE', title: 'invoice-14.pdf', assignmentId: 'a26', invoiceNumber: '14', amount: '2500', currency: 'EUR',
    })));
});

test('without the write permission documents are read-only, and without read the tab does not exist', async () => {
    jest.mocked(listChoreographerDocuments).mockResolvedValue([fileDocument({})]);
    const view = renderAt('/people/choreographers/person-1/documents', [...ALL, 'documents.read']);
    expect(await screen.findByRole('button', { name: 'Open: Contract 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Upload document' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Status: Contract 2026')).not.toBeInTheDocument();
    view.unmount();

    jest.mocked(listChoreographerDocuments).mockClear();
    renderAt('/people/choreographers/person-1/documents', ALL);
    expect(await screen.findByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(listChoreographerDocuments).not.toHaveBeenCalled();
});

test('the event page lists the same documents and links back to the choreographer', async () => {
    jest.mocked(listEventDocuments).mockResolvedValue([fileDocument({})]);
    const store = createReduxStore({ user: { authData: { id: 'u', name: 'Staff', email: 's@example.test', permissions: ['documents.read'] }, _inited: true } } as never) as ReduxStoreWithManager;
    render(<Provider store={store}><MemoryRouter><EventDocuments eventId="event-2026" /></MemoryRouter></Provider>);

    expect(await screen.findByRole('link', { name: 'Contract 2026' })).toHaveAttribute('href', '/people/choreographers/person-1/documents');
    expect(listEventDocuments).toHaveBeenCalledWith('event-2026');
    fireEvent.click(screen.getByRole('button', { name: 'Open: Contract 2026' }));
    await waitFor(() => expect(fetchDocumentFile).toHaveBeenCalledWith('doc-1', undefined));
});

const thread = (overrides: Partial<ChoreographerThread>): ChoreographerThread => ({
    id: 'thread-1', subject: 'Fee for 2027', status: 'OPEN', lastMessageAt: '2026-10-01T10:00:00.000Z', event: null,
    person: { id: 'person-1', displayName: 'Joanna Gomez', email: 'jojo@example.test' },
    latestMessage: { direction: 'INBOUND', sender: 'jojo@example.test', recipient: 'info@hhdc.test', preview: 'Can we talk about the fee?', createdAt: '2026-10-01T10:00:00.000Z' },
    provenance: 'direct_person_email', link: null, ...overrides,
});
const managerThread = thread({
    id: 'thread-2', subject: 'Agency: 2027 terms', provenance: 'manual_link', person: { id: 'person-m', displayName: 'Sam Lee', email: 'sam@agency.test' },
    link: { id: 'link-1', note: 'Sam wrote about Jojo', createdAt: '2026-10-02T10:00:00.000Z' },
});
const MAIL = [...ALL, 'choreographers.conversations.read', 'choreographers.conversations.link', 'choreographers.activity.read'];

test('emails show why each conversation is on the profile; only a hand-made link can be removed', async () => {
    jest.mocked(listChoreographerThreads).mockResolvedValue({ data: [thread({}), managerThread], candidates: [], total: 2 });
    jest.spyOn(window, 'prompt').mockReturnValue('It was about another choreographer');
    renderAt('/people/choreographers/person-1/emails', MAIL);

    const own = await screen.findByRole('article', { name: 'Fee for 2027' });
    expect(own).toHaveTextContent('PROVENANCE_direct_person_email');
    expect(own).toHaveTextContent('Can we talk about the fee?');
    const linked = screen.getByRole('article', { name: 'Agency: 2027 terms' });
    expect(linked).toHaveTextContent('PROVENANCE_manual_link');
    expect(linked).toHaveTextContent('Reason for the link: Sam wrote about Jojo');
    expect(screen.queryByRole('button', { name: 'Unlink: Fee for 2027' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unlink: Agency: 2027 terms' }));

    await waitFor(() => expect(unlinkChoreographerThread).toHaveBeenCalledWith('person-1', 'thread-2', 'It was about another choreographer'));
});

test('a conversation is linked only by choice and with a reason', async () => {
    jest.mocked(listChoreographerThreads).mockResolvedValue({ data: [], candidates: [thread({ id: 'thread-9', subject: 'From my private mail', person: null })], total: 0 });
    jest.mocked(listConversations).mockResolvedValue({ data: [{ id: 'thread-2', subject: 'Agency: 2027 terms', status: 'OPEN' }] as never, total: 1 });
    renderAt('/people/choreographers/person-1/emails', MAIL);

    const form = await screen.findByRole('form', { name: 'Link conversation' });
    expect(await screen.findByRole('option', { name: 'From my private mail' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Find conversation'), { target: { value: 'agency' } });
    await screen.findByRole('option', { name: 'Agency: 2027 terms' });
    fireEvent.change(screen.getByLabelText('Conversation'), { target: { value: 'thread-2' } });
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a conversation and say why it belongs here');
    expect(linkChoreographerThread).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Conversation'), { target: { value: 'thread-2' } });
    fireEvent.change(screen.getByLabelText('Reason for the link'), { target: { value: 'Sam wrote about Jojo' } });
    fireEvent.submit(form);
    await waitFor(() => expect(linkChoreographerThread).toHaveBeenCalledWith('person-1', 'thread-2', 'Sam wrote about Jojo'));
});

test('without the link permission the emails are read-only', async () => {
    jest.mocked(listChoreographerThreads).mockResolvedValue({ data: [managerThread], candidates: [], total: 1 });
    renderAt('/people/choreographers/person-1/emails', [...ALL, 'choreographers.conversations.read']);

    await screen.findByRole('article', { name: 'Agency: 2027 terms' });
    expect(screen.queryByRole('button', { name: /Unlink/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Link conversation' })).not.toBeInTheDocument();
});

test('the activity timeline pages backwards and filters by kind', async () => {
    const entry = (id: string, type: string, createdAt: string) => ({ id, type, entityType: 'ChoreographerProfile', createdAt, actor: 'Denis', event: null });
    jest.mocked(listChoreographerActivity).mockImplementation(async (_personId, filters) => (filters?.before
        ? { data: [entry('a1', 'CHOREOGRAPHER_PROFILE_CREATED', '2026-09-01T10:00:00.000Z')], nextBefore: null }
        : { data: [entry('a2', 'CHOREOGRAPHER_PHOTO_ADDED', '2026-10-01T10:00:00.000Z')], nextBefore: '2026-10-01T10:00:00.000Z' }));
    renderAt('/people/choreographers/person-1/activity', MAIL);

    const timeline = await screen.findByRole('region', { name: 'Activity' });
    await waitFor(() => expect(timeline.querySelectorAll('li')).toHaveLength(1));
    expect(timeline).toHaveTextContent('Denis');
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(timeline.querySelectorAll('li')).toHaveLength(2));
    expect(listChoreographerActivity).toHaveBeenLastCalledWith('person-1', { type: undefined, before: '2026-10-01T10:00:00.000Z' });

    fireEvent.change(screen.getByLabelText('Show'), { target: { value: 'CHOREOGRAPHER_PHOTO' } });
    await waitFor(() => expect(listChoreographerActivity).toHaveBeenLastCalledWith('person-1', { type: 'CHOREOGRAPHER_PHOTO', before: undefined }));
});

const NOTES = [...ALL, 'choreographers.notes.read', 'choreographers.notes.manage', 'tasks.read', 'tasks.write'];
const followUp = (overrides: Partial<ChoreographerTask>): ChoreographerTask => ({
    id: 'task-1', title: 'Send contract', description: null, status: 'TODO', priority: 'HIGH', dueDate: '2020-01-01T10:00:00.000Z', assignee: { id: 'u', name: 'Denis' }, ...overrides,
});

test('notes are internal, pinned ones are marked, and a note can be added, pinned and removed', async () => {
    jest.mocked(listChoreographerNotes).mockResolvedValue([
        { id: 'n1', content: 'Needs a visa letter', isPinned: true, createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', createdByName: 'Denis' },
        { id: 'n2', content: 'Prefers morning classes', isPinned: false, createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T10:00:00.000Z', createdByName: null },
    ]);
    renderAt('/people/choreographers/person-1/notes', NOTES);

    const pinned = await screen.findByRole('article', { name: 'Needs a visa letter' });
    expect(pinned).toHaveTextContent('Pinned');
    expect(pinned).toHaveTextContent('Denis');
    expect(screen.getByRole('region', { name: 'Internal notes' })).toHaveTextContent('Visible to staff only. Never sent to the choreographer.');
    fireEvent.click(screen.getByRole('button', { name: 'Pin: Prefers morning classes' }));
    await waitFor(() => expect(updateChoreographerNote).toHaveBeenCalledWith('person-1', 'n2', { isPinned: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete: Needs a visa letter' }));
    await waitFor(() => expect(removeChoreographerNote).toHaveBeenCalledWith('person-1', 'n1'));

    fireEvent.change(screen.getByLabelText('New note'), { target: { value: ' Vegetarian ' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Add note' }));
    await waitFor(() => expect(addChoreographerNote).toHaveBeenCalledWith('person-1', 'Vegetarian', false));
});

test('follow-ups show what is overdue, can be closed, and a new one is due at the end of the chosen day', async () => {
    jest.mocked(listChoreographerTasks).mockResolvedValue([followUp({}), followUp({ id: 'task-2', title: 'Old one', status: 'DONE' })]);
    renderAt('/people/choreographers/person-1/notes', NOTES);

    const list = await screen.findByRole('region', { name: 'Follow-ups' });
    await waitFor(() => expect(list).toHaveTextContent('Send contract'));
    expect(list).toHaveTextContent('Overdue');
    expect(screen.queryByRole('button', { name: 'Mark done: Old one' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark done: Send contract' }));
    await waitFor(() => expect(updateTaskStatus).toHaveBeenCalledWith('task-1', 'DONE'));

    fireEvent.change(screen.getByLabelText('What needs to be done'), { target: { value: 'Request updated photos' } });
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2027-03-01' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Add follow-up' }));
    await waitFor(() => expect(addChoreographerTask).toHaveBeenCalledWith('person-1', { title: 'Request updated photos', dueDate: dueAtEndOfDay('2027-03-01'), priority: 'NORMAL' }));
});

test('notes are read-only without the manage permission and tasks are not requested without tasks.read', async () => {
    jest.mocked(listChoreographerNotes).mockResolvedValue([{ id: 'n1', content: 'Needs a visa letter', isPinned: false, createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', createdByName: null }]);
    renderAt('/people/choreographers/person-1/notes', [...ALL, 'choreographers.notes.read']);

    await screen.findByRole('article', { name: 'Needs a visa letter' });
    expect(screen.queryByRole('form', { name: 'Add note' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Follow-ups' })).not.toBeInTheDocument();
    expect(listChoreographerTasks).not.toHaveBeenCalled();
});

test('only an open task past its due date is overdue', () => {
    const now = new Date('2026-10-09T09:00:00Z');
    expect(isOverdue(followUp({ dueDate: '2026-10-08T09:00:00Z' }), now)).toBe(true);
    expect(isOverdue(followUp({ dueDate: '2026-10-10T09:00:00Z' }), now)).toBe(false);
    expect(isOverdue(followUp({ dueDate: '2026-10-08T09:00:00Z', status: 'DONE' }), now)).toBe(false);
    expect(isOverdue(followUp({ dueDate: null }), now)).toBe(false);
    expect(dueAtEndOfDay('')).toBeNull();
});
