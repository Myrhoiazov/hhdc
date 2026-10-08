import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { importWeeztixContacts, previewWeeztixContacts, syncWeeztixCatalog, syncWeeztixSales } from '@/entities/crm';
import { WeeztixData } from './WeeztixData';

jest.mock('@/entities/crm', () => ({ importWeeztixContacts: jest.fn(), previewWeeztixContacts: jest.fn(), syncWeeztixCatalog: jest.fn(), syncWeeztixSales: jest.fn() }));

const counts = { orders: 1448, contacts: 1168, created: 1148, linked: 20, known: 0, ambiguous: 0, failed: 0 };

beforeEach(() => {
    jest.mocked(importWeeztixContacts).mockReset();
    jest.mocked(previewWeeztixContacts).mockReset();
    jest.mocked(syncWeeztixCatalog).mockReset();
});

test('contacts are imported only after the check has shown what would happen', async () => {
    jest.mocked(previewWeeztixContacts).mockResolvedValue({ ...counts, dryRun: true });
    jest.mocked(importWeeztixContacts).mockResolvedValue({ ...counts, dryRun: false });
    render(<WeeztixData connectionId="p1" />);
    expect(screen.queryByRole('button', { name: /^Import/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check contacts' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Import/ }));

    await waitFor(() => expect(importWeeztixContacts).toHaveBeenCalledWith('p1'));
    expect(await screen.findByRole('status')).toHaveTextContent('Contacts imported');
    expect(screen.queryByRole('button', { name: /^Import/ })).not.toBeInTheDocument();
});

test('when everyone is already imported there is nothing to import', async () => {
    jest.mocked(previewWeeztixContacts).mockResolvedValue({ ...counts, created: 0, linked: 0, known: 1168, dryRun: true });
    render(<WeeztixData connectionId="p1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Check contacts' }));

    expect(await screen.findByText('Nothing new to import')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Import/ })).not.toBeInTheDocument();
});

test('syncing events reports what changed, and a refusal shows the reason', async () => {
    jest.mocked(syncWeeztixCatalog).mockResolvedValueOnce({ events: 14, created: 14, updated: 0, unchanged: 0, ticketTypes: 47, coupons: 24, unreadable: 0, failed: 0 });
    render(<WeeztixData connectionId="p1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Sync events and prices' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Events');
    expect(syncWeeztixCatalog).toHaveBeenCalledWith('p1');

    jest.mocked(syncWeeztixCatalog).mockRejectedValueOnce(new Error('Weeztix is not connected'));
    fireEvent.click(screen.getByRole('button', { name: 'Sync events and prices' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Weeztix is not connected');
});

test('syncing sales reports orders and tickets, and names the first order that failed', async () => {
    const catalog = { events: 14, created: 0, updated: 0, unchanged: 14, ticketTypes: 47, coupons: 24, unreadable: 0, failed: 0 };
    const sales = { orders: 1448, created: 2, updated: 3, unchanged: 1442, tickets: 1718, registrations: 2, newPeople: 1, withoutBuyer: 0, unreadable: 2, failed: 1, firstError: 'Order o-9 has a ticket type the CRM has not read yet' };
    jest.mocked(syncWeeztixSales).mockResolvedValue({ catalog, sales });
    render(<WeeztixData connectionId="p1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Sync orders and tickets' }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Orders');
    expect(status).toHaveTextContent('First error');
    expect(syncWeeztixSales).toHaveBeenCalledWith('p1');
});
