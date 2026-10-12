import { fireEvent, render, screen } from '@testing-library/react';
import { Message } from '@/entities/crm';
import { MessageThread } from './MessageThread';

jest.mock('@/entities/crm', () => ({}), { virtual: true });

const letter = (id: string, bodyText: string, extra: Partial<Message> = {}): Message => ({
    id, direction: 'INBOUND', sender: `${id}@example.test`, recipient: 'info@example.test', bodyText,
    createdAt: '2026-10-07T10:00:00.000Z', ...extra,
});

const thread = [letter('first', 'Is the camp sold out?'), letter('second', 'Any news?'), letter('third', 'Thank you!')];

// The test i18n mock does not interpolate the sender, so headers are addressed by position.
const toggleAt = (index: number) => screen.getAllByRole('button', { name: /^From/ })[index];

test('a long thread opens with only the latest letter unfolded', () => {
    render(<MessageThread messages={thread} />);

    expect(toggleAt(2)).toHaveAttribute('aria-expanded', 'true');
    expect(toggleAt(0)).toHaveAttribute('aria-expanded', 'false');
    expect(toggleAt(1)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Thank you!').tagName).toBe('P');
});

test('a folded letter shows the start of its text without the quoted history', () => {
    const quoted = letter('quoted', 'Hello,\n\nPayment received.\n> On 4 Oct someone wrote:\n> Old text');
    render(<MessageThread messages={[quoted, letter('last', 'Bye')]} />);

    expect(screen.getByText('Hello, Payment received.')).toBeInTheDocument();
    expect(screen.queryByText(/Old text/)).not.toBeInTheDocument();
});

test('clicking a letter header unfolds it and keeps the others as they were', () => {
    render(<MessageThread messages={thread} />);

    fireEvent.click(toggleAt(0));

    expect(toggleAt(0)).toHaveAttribute('aria-expanded', 'true');
    expect(toggleAt(2)).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Is the camp sold out?').tagName).toBe('P');

    fireEvent.click(toggleAt(2));
    expect(toggleAt(2)).toHaveAttribute('aria-expanded', 'false');
});

test('every letter can be unfolded or folded at once', () => {
    render(<MessageThread messages={thread} />);

    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    thread.forEach((_, index) => expect(toggleAt(index)).toHaveAttribute('aria-expanded', 'true'));

    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    thread.forEach((_, index) => expect(toggleAt(index)).toHaveAttribute('aria-expanded', 'false'));
});

test('a single letter is unfolded and has no fold-all control', () => {
    render(<MessageThread messages={[letter('only', 'Can I join?')]} />);

    expect(toggleAt(0)).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('button', { name: /all$/ })).not.toBeInTheDocument();
});

test('a letter that arrives later is unfolded as the newest one', () => {
    const { rerender } = render(<MessageThread messages={thread} />);

    rerender(<MessageThread messages={[...thread, letter('fourth', 'One more thing')]} />);

    expect(toggleAt(3)).toHaveAttribute('aria-expanded', 'true');
    expect(toggleAt(2)).toHaveAttribute('aria-expanded', 'false');
});
