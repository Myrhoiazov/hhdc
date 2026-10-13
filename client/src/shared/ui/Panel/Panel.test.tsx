import { render, screen } from '@testing-library/react';
import { Panel } from './Panel';

test('a panel is a section that keeps what it is given', () => {
    render(<Panel id="event-team" aria-label="Team" className="wide">Body</Panel>);

    const panel = screen.getByRole('region', { name: 'Team' });
    expect(panel.tagName).toBe('SECTION');
    expect(panel).toHaveAttribute('id', 'event-team');
    expect(panel).toHaveClass('Panel', 'wide');
});

test('a panel can be the form itself', () => {
    const onSubmit = jest.fn(event => event.preventDefault());
    render(<Panel as="form" aria-label="Add" onSubmit={onSubmit}><button type="submit">Save</button></Panel>);

    screen.getByRole('button', { name: 'Save' }).click();

    expect(screen.getByRole('form', { name: 'Add' })).toHaveClass('Panel');
    expect(onSubmit).toHaveBeenCalledTimes(1);
});
