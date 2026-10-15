import {
    renderAt,
    ALL,
    answerChoreographerRequests,
    historyItem,
} from './ChoreographerPages.testHelpers';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { listChoreographerHistory } from '@/entities/Choreographer';
import {
    openDocumentFile,
    FileDocument,
    listChoreographerDocuments,
    listEventDocuments,
    updateDocumentMetadata,
    uploadChoreographerDocument,
    uploadDocumentVersion,
} from '@/entities/Document';
import { EventDocuments } from '@/widgets/EventDocuments';

answerChoreographerRequests();

const fileDocument = (overrides: Partial<FileDocument>): FileDocument => ({
    id: 'doc-1',
    type: 'CONTRACT',
    title: 'Contract 2026',
    notes: null,
    entityId: 'person-1',
    eventId: 'event-2026',
    assignmentId: 'assignment-26',
    currentVersion: 2,
    archivedAt: null,
    createdAt: '2026-02-01T10:00:00.000Z',
    event: { id: 'event-2026', name: 'HHDC 2026' },
    contract: {
        status: 'SENT',
        sentAt: '2026-02-01T10:00:00.000Z',
        signedAt: null,
        expiresAt: null,
    },
    invoice: null,
    paymentEvidence: null,
    versions: [
        {
            version: 2,
            originalFilename: 'contract-signed.pdf',
            mimeType: 'application/pdf',
            bytes: 2000,
            createdAt: '2026-02-10T10:00:00.000Z',
        },
        {
            version: 1,
            originalFilename: 'contract.pdf',
            mimeType: 'application/pdf',
            bytes: 1800,
            createdAt: '2026-02-01T10:00:00.000Z',
        },
    ],
    ...overrides,
});
const invoiceDocument = fileDocument({
    id: 'doc-2',
    type: 'INVOICE',
    title: 'Invoice 14',
    currentVersion: 1,
    contract: null,
    paymentEvidence: 'NONE',
    duplicateOfDocumentId: 'doc-9',
    invoice: {
        status: 'RECEIVED',
        invoiceNumber: '14',
        issuerName: 'Jojo LLC',
        amount: '2500.00',
        currency: 'EUR',
        dueDate: null,
    },
    versions: [
        {
            version: 1,
            originalFilename: 'invoice.pdf',
            mimeType: 'application/pdf',
            bytes: 900,
            createdAt: '2026-06-01T10:00:00.000Z',
        },
    ],
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
    await waitFor(() => expect(openDocumentFile).toHaveBeenCalledWith('doc-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Contract 2026: v1' }));
    await waitFor(() => expect(openDocumentFile).toHaveBeenCalledWith('doc-1', 1));

    fireEvent.change(screen.getByLabelText('Status: Contract 2026'), {
        target: { value: 'SIGNED' },
    });
    await waitFor(() =>
        expect(updateDocumentMetadata).toHaveBeenCalledWith('doc-1', { contractStatus: 'SIGNED' })
    );
    const replacement = new File(['%PDF-2'], 'final.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Upload new version: Contract 2026'), {
        target: { files: [replacement] },
    });
    await waitFor(() => expect(uploadDocumentVersion).toHaveBeenCalledWith('doc-1', replacement));
});

test('an invoice is uploaded with its details and linked to the event assignment', async () => {
    jest.mocked(listChoreographerHistory).mockResolvedValue([
        historyItem('a26', 'HHDC 2026', 2026, 'PAST'),
    ]);
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

    await waitFor(() =>
        expect(uploadChoreographerDocument).toHaveBeenCalledWith(
            'person-1',
            file,
            expect.objectContaining({
                type: 'INVOICE',
                title: 'invoice-14.pdf',
                assignmentId: 'a26',
                invoiceNumber: '14',
                amount: '2500',
                currency: 'EUR',
            })
        )
    );
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
    expect(await screen.findByRole('link', { name: 'Overview' })).toHaveAttribute(
        'aria-current',
        'page'
    );
    expect(listChoreographerDocuments).not.toHaveBeenCalled();
});

test('the event page lists the same documents and links back to the choreographer', async () => {
    jest.mocked(listEventDocuments).mockResolvedValue([fileDocument({})]);
    const store = createReduxStore({
        user: {
            authData: {
                id: 'u',
                name: 'Staff',
                email: 's@example.test',
                permissions: ['documents.read'],
            },
            _inited: true,
        },
    } as never) as ReduxStoreWithManager;
    render(
        <Provider store={store}>
            <MemoryRouter>
                <EventDocuments eventId="event-2026" />
            </MemoryRouter>
        </Provider>
    );

    expect(await screen.findByRole('link', { name: 'Contract 2026' })).toHaveAttribute(
        'href',
        '/people/choreographers/person-1/documents'
    );
    expect(listEventDocuments).toHaveBeenCalledWith('event-2026');
    fireEvent.click(screen.getByRole('button', { name: 'Open: Contract 2026' }));
    await waitFor(() => expect(openDocumentFile).toHaveBeenCalledWith('doc-1'));
});
