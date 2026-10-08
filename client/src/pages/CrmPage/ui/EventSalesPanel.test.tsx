import { render, screen, within } from '@testing-library/react';
import { getEventSales } from '@/entities/crm';
import { EventSalesPanel } from './EventSalesPanel';

jest.mock('@/entities/crm', () => ({ getEventSales: jest.fn() }));

const empty = { currency: 'EUR', tickets: 0, withdrawn: 0, orders: 0, buyers: 0, revenue: '0.00', discount: '0.00', byType: [], byMonth: [], coupons: [] };

test('the panel shows totals, sales by ticket type and month, and the coupons used', async () => {
    jest.mocked(getEventSales).mockResolvedValue({
        ...empty, tickets: 137, orders: 135, buyers: 130, revenue: '40480.00', discount: '6230.00',
        byType: [{ name: 'Early Bird | Full Pass', tickets: 25, revenue: '5850.00' }],
        byMonth: [{ name: '2026-05', tickets: 68, revenue: '20605.00' }],
        coupons: [{ name: '#HHDC2027 free', tickets: 12, discount: '4560.00' }],
    });
    render(<EventSalesPanel eventId="e1" />);

    const panel = await screen.findByRole('region', { name: 'Ticket sales' });
    expect(await within(panel).findByText('137')).toBeInTheDocument();
    expect(within(panel).getByText(/40,480/)).toBeInTheDocument();
    const types = within(panel).getByRole('table', { name: 'By ticket type' });
    expect(within(types).getByText('Early Bird | Full Pass')).toBeInTheDocument();
    expect(within(types).getByText(/5,850\.00/)).toBeInTheDocument();
    expect(within(within(panel).getByRole('table', { name: 'Coupons' })).getByText(/4,560\.00/)).toBeInTheDocument();
    expect(within(panel).getByText(/May 2026/)).toBeInTheDocument();
    expect(within(panel).getByText('#HHDC2027 free')).toBeInTheDocument();
    expect(getEventSales).toHaveBeenCalledWith('e1');
});

test('an event without sales says so instead of showing zeros', async () => {
    jest.mocked(getEventSales).mockResolvedValue(empty);
    render(<EventSalesPanel eventId="e1" />);

    expect(await screen.findByText('No tickets sold yet')).toBeInTheDocument();
    expect(screen.queryByText('Tickets sold')).not.toBeInTheDocument();
});

test('a refusal to show sales is reported, not hidden', async () => {
    jest.mocked(getEventSales).mockRejectedValue(new Error('Forbidden'));
    render(<EventSalesPanel eventId="e1" />);

    expect(await screen.findByText('Forbidden')).toBeInTheDocument();
});
