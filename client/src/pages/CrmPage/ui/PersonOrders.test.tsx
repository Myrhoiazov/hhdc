import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { listPersonOrders, PersonOrder } from '@/entities/crm';
import { PersonOrders } from './PersonOrders';

jest.mock('@/entities/crm', () => ({ listPersonOrders: jest.fn() }));

const order: PersonOrder = {
    id: 'o1', externalId: 'c7958037-0000', status: 'PAID', currency: 'EUR', subtotal: '390.00', fees: '0.79', total: '390.79', orderedAt: '2026-10-06T06:38:00Z',
    shopName: 'Ticketshop', answers: [{ name: 'keep_me_informed', value: '0' }, { name: 'phonenumber', value: '+31600000001' }], downloadUrl: 'https://tickets.example.test/order', event: { id: 'e1', name: 'Dance Camp' }, boughtByPerson: true,
    tickets: [{ id: 't1', ticketType: 'Early Bird | Full Pass', barcode: 'T2PES7', status: 'VALID', price: '390.00', listPrice: '390.00', serviceFee: '0.79', couponCode: null, downloadUrl: 'https://tickets.example.test/t1.pdf', event: { id: 'e1', name: 'Dance Camp' }, checkedIn: false, heldByPerson: true }],
    payments: [{ id: 'p1', amount: '397.00', currency: 'EUR', status: 'PAID', method: 'iDeal', paidAt: '2026-10-06T06:39:00Z' }],
};

const renderOrders = () => render(<MemoryRouter><PersonOrders personId="person-1" /></MemoryRouter>);

test('a purchase shows the order as the ticket shop does: shop, booker answers, order id, tickets and payment', async () => {
    jest.mocked(listPersonOrders).mockResolvedValue([order]);
    renderOrders();

    const panel = await screen.findByRole('region', { name: 'Purchases' });
    expect(await within(panel).findByText('Ticketshop')).toBeInTheDocument();
    expect(within(panel).getByText('c7958037-0000')).toBeInTheDocument();
    expect(within(panel).getByText(/\+31600000001/)).toBeInTheDocument();
    expect(within(panel).getByText(/Early Bird \| Full Pass/)).toBeInTheDocument();
    expect(within(panel).getByText(/T2PES7/)).toBeInTheDocument();
    expect(within(panel).getByText(/iDeal/)).toBeInTheDocument();
    expect(listPersonOrders).toHaveBeenCalledWith('person-1');
});

test('the ticket and the order open in a new tab without passing the CRM address along', async () => {
    jest.mocked(listPersonOrders).mockResolvedValue([order]);
    renderOrders();

    const ticket = await screen.findByRole('link', { name: 'Open ticket', hidden: true });
    expect(ticket).toHaveAttribute('href', 'https://tickets.example.test/t1.pdf');
    expect(ticket).toHaveAttribute('target', '_blank');
    expect(ticket).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'Open the download page of the order', hidden: true })).toHaveAttribute('href', 'https://tickets.example.test/order');
});

test('a ticket without a file has no link, and a person without purchases is told so', async () => {
    jest.mocked(listPersonOrders).mockResolvedValue([{ ...order, downloadUrl: null, tickets: [{ ...order.tickets[0], downloadUrl: null }] }]);
    const { unmount } = renderOrders();
    await screen.findByText(/Early Bird/);
    expect(screen.queryByRole('link', { name: 'Open ticket', hidden: true })).not.toBeInTheDocument();
    unmount();

    jest.mocked(listPersonOrders).mockResolvedValue([]);
    renderOrders();
    expect(await screen.findByText('No purchases yet')).toBeInTheDocument();
});
