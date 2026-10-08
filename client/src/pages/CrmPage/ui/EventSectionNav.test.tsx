import { fireEvent, render, screen, within } from '@testing-library/react';
import { EventSectionNav } from './EventSectionNav';

const renderWith = (ids: string[]) => render(<><EventSectionNav />{ids.map(id => <section key={id} id={id} data-testid={id} />)}</>);

beforeEach(() => { Element.prototype.scrollIntoView = jest.fn(); });

test('the navigation offers the blocks that are on the page, in page order, and nothing else', () => {
    renderWith(['event-registrations', 'event-sales', 'event-ticket-types']);

    const nav = screen.getByRole('navigation', { name: 'Sections of the event page' });
    expect(within(nav).getAllByRole('button').map(button => button.textContent)).toEqual(['Ticket sales', 'Ticket types', 'Registrations']);
    expect(within(nav).queryByRole('button', { name: 'Expenses' })).not.toBeInTheDocument();
});

test('choosing a block scrolls to it and leaves room for the navigation above it', () => {
    renderWith(['event-sales', 'event-expenses']);

    fireEvent.click(screen.getByRole('button', { name: 'Expenses' }));

    const section = screen.getByTestId('event-expenses');
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(section.style.scrollMarginTop).toBe('72px');
});
