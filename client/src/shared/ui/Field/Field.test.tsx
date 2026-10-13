import { render, screen } from '@testing-library/react';
import { Field } from './Field';

test('the caption names the control inside it', () => {
    render(<Field label="Amount"><input name="amount" /></Field>);

    expect(screen.getByLabelText('Amount')).toHaveAttribute('name', 'amount');
});

test('a class of the owner is added to the shared one', () => {
    const { container } = render(<Field label="Amount" className="narrow"><input /></Field>);

    expect(container.firstChild).toHaveClass('Field', 'narrow');
});
