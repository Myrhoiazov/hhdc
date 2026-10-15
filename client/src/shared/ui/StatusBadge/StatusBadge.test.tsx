import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

test('what went well is green', () => {
    render(<StatusBadge status="PAID" />);
    expect(screen.getByText('PAID')).toHaveClass('Badge', 'success');
});

test('what failed is red', () => {
    render(<StatusBadge status="FAILED" />);
    expect(screen.getByText('FAILED')).toHaveClass('Badge', 'danger');
});

test('anything else is neutral', () => {
    render(<StatusBadge status="PENDING" />);
    const badge = screen.getByText('PENDING');
    expect(badge).not.toHaveClass('success');
    expect(badge).not.toHaveClass('danger');
});
