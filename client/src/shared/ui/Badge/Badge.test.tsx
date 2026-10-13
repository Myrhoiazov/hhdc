import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

test('a badge without a tone is neutral', () => {
    render(<Badge>Draft</Badge>);

    const badge = screen.getByText('Draft');
    expect(badge).toHaveClass('Badge');
    expect(badge).not.toHaveClass('success');
    expect(badge).not.toHaveClass('danger');
});

test.each(['success', 'danger'] as const)('a %s badge takes the colour of its tone', tone => {
    render(<Badge tone={tone}>Paid</Badge>);

    expect(screen.getByText('Paid')).toHaveClass('Badge', tone);
});

test('a class of the owner is added to the shared one', () => {
    render(<Badge className="role" title="Role">Staff</Badge>);

    expect(screen.getByTitle('Role')).toHaveClass('Badge', 'role');
});
