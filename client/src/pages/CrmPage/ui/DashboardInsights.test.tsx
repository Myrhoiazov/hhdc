import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardInsights, getDashboardInsights } from '@/entities/crm';
import { DashboardInsightsPanel } from './DashboardInsights';

jest.mock('@/entities/crm', () => ({ getDashboardInsights: jest.fn() }));

const event = (id: string, name: string, revenue: string) => ({ id, name, startAt: '2026-05-15T10:00:00Z', tickets: 445, revenue, discount: '9665.00', costs: '6200.00', result: '133215.00' });
const country = (index: number) => ({ code: ['DE', 'NL', 'FR', 'UA', 'PL', 'BE', 'CH', 'GB', 'IT', 'IE', 'CZ', 'FI', 'IL', 'LU'][index], buyers: 220 - index * 10, tickets: 300 - index * 10, revenue: '1000.00' });
const insights: DashboardInsights = {
    currency: 'EUR', totals: { revenue: '376402.00', costs: '6200.00', result: '370202.00', tickets: 1713, buyers: 1167, events: 14 },
    years: [
        { year: 2026, tickets: 637, revenue: '143811.00', discount: '9665.00', costs: '6200.00', result: '137611.00', events: [event('e1', 'Dance Camp 2026', '139415.00')] },
        { year: 2025, tickets: 490, revenue: '98630.00', discount: '4850.00', costs: '0.00', result: '98630.00', events: [event('e2', 'Dance Camp 2025', '96109.00')] },
    ],
    countries: Array.from({ length: 14 }, (_, index) => country(index)), notGiven: 238, notRecognised: 10,
};

const renderPanel = () => render(<MemoryRouter><DashboardInsightsPanel /></MemoryRouter>);

beforeEach(() => { jest.mocked(getDashboardInsights).mockReset(); });

test('the headline numbers are income, costs, result, tickets and buyers', async () => {
    jest.mocked(getDashboardInsights).mockResolvedValue(insights);
    renderPanel();

    expect(await screen.findByText('€376,402')).toBeInTheDocument();
    expect(screen.getByText('€370,202')).toBeInTheDocument();
    expect(screen.getByText('1,713')).toBeInTheDocument();
    expect(screen.getByText('1,167')).toBeInTheDocument();
});

test('each year shows its money and lists its events with a link to the event', async () => {
    jest.mocked(getDashboardInsights).mockResolvedValue(insights);
    renderPanel();

    const years = await screen.findByRole('region', { name: 'Income and costs by year' });
    expect(within(years).getByText('2026')).toBeInTheDocument();
    expect(within(years).getByText('2025')).toBeInTheDocument();
    expect(within(years).getAllByText('€143,811').length).toBeGreaterThan(0);
    expect(within(years).getByRole('link', { name: 'Dance Camp 2026' })).toHaveAttribute('href', '/events/e1');
    expect(within(years).queryByText(/No costs are recorded yet/)).not.toBeInTheDocument();
});

test('when nothing was spent the page says the result equals the income', async () => {
    jest.mocked(getDashboardInsights).mockResolvedValue({ ...insights, totals: { ...insights.totals, costs: '0.00' } });
    renderPanel();

    expect(await screen.findByText(/No costs are recorded yet/)).toBeInTheDocument();
});

test('countries are named in the language of the interface, and the tail is folded into one line', async () => {
    jest.mocked(getDashboardInsights).mockResolvedValue(insights);
    renderPanel();

    const countries = await screen.findByRole('region', { name: 'Buyers by country' });
    expect(within(countries).getByText('Germany')).toBeInTheDocument();
    expect(within(countries).getByText('Finland')).toBeInTheDocument();
    expect(within(countries).queryByText('Israel')).not.toBeInTheDocument();
    expect(within(countries).getByText(/Other countries/)).toBeInTheDocument();
    expect(within(countries).getAllByRole('row')).toHaveLength(14);
    expect(within(countries).getByText(/Country not given/)).toBeInTheDocument();
});
