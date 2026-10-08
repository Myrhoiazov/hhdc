import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Event, listEventsPage } from '@/entities/crm';
import { EventsPage } from './EventsList';

jest.mock('@/entities/crm', () => ({
    createEvent: jest.fn(), listEventsPage: jest.fn(), LIST_PAGE_SIZE: 25, EVENT_STATUSES: ['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED'],
}));
jest.mock('@/widgets/Page', () => ({ Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const event = (id: string, overrides: Partial<Event> = {}): Event => ({
    id, name: 'Dance Camp 2027', slug: 'dance-camp-2027', status: 'PUBLISHED', startAt: '2027-05-21T10:00:00Z', endAt: '2027-05-23T18:00:00Z', timezone: 'Europe/Amsterdam',
    venueName: 'Apollohal', city: 'Amsterdam', _count: { tickets: 137, registrations: 130 }, ...overrides,
});

const NO_FILTERS = { q: '', status: '', period: '' };
const renderPage = () => render(<MemoryRouter><EventsPage /></MemoryRouter>);

beforeEach(() => { jest.mocked(listEventsPage).mockReset(); });

test('an event is a table row: name linking to the event, dates, venue, status, tickets and registrations', async () => {
    jest.mocked(listEventsPage).mockResolvedValue({ data: [event('e1')], total: 1 });
    renderPage();

    const link = await screen.findByRole('link', { name: 'Dance Camp 2027' });
    expect(link).toHaveAttribute('href', '/events/e1');
    const row = link.closest('tr') as HTMLElement;
    for (const text of ['Apollohal, Amsterdam', 'PUBLISHED', '137', '130']) expect(within(row).getByText(text)).toBeInTheDocument();
    expect(within(row).getByText(/ – /)).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});

test('a one-day event shows one date, and an event without a venue shows a dash', async () => {
    jest.mocked(listEventsPage).mockResolvedValue({ data: [event('e1', { endAt: '2027-05-21T18:00:00Z', venueName: null, city: null })], total: 1 });
    renderPage();

    const row = (await screen.findByRole('link', { name: 'Dance Camp 2027' })).closest('tr') as HTMLElement;
    expect(within(row).queryByText(/ – /)).not.toBeInTheDocument();
    expect(within(row).getByText('—')).toBeInTheDocument();
});

test('a filter narrows the list and returns to the first page; reset clears every filter', async () => {
    jest.mocked(listEventsPage).mockResolvedValue({ data: [event('e1')], total: 60 });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(listEventsPage).toHaveBeenLastCalledWith(NO_FILTERS, 2));

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'COMPLETED' } });
    await waitFor(() => expect(listEventsPage).toHaveBeenLastCalledWith({ ...NO_FILTERS, status: 'COMPLETED' }, 1));
    fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'past' } });
    await waitFor(() => expect(listEventsPage).toHaveBeenLastCalledWith({ ...NO_FILTERS, status: 'COMPLETED', period: 'past' }, 1));

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    await waitFor(() => expect(listEventsPage).toHaveBeenLastCalledWith(NO_FILTERS, 1));
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeDisabled();
});

test('an empty list says whether there are no events at all or none for the filters', async () => {
    jest.mocked(listEventsPage).mockResolvedValue({ data: [], total: 0 });
    renderPage();
    expect(await screen.findByText('No events yet')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'upcoming' } });
    expect(await screen.findByText('No events match the filters')).toBeInTheDocument();
});
