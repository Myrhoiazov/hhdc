import { fireEvent, render, screen } from '@testing-library/react';
import { CustomersSelect } from './CustomersSelect';
import { MollieClient } from '@/entities/MollieClient';

const customers: MollieClient[] = [
    { id: '1', givenName: 'Ivan', familyName: 'Petrov' },
    { id: '2', mollieId: 'cst_2' },
];

describe('CustomersSelect', () => {
    test('renders the full name when given/family name are present', () => {
        render(<CustomersSelect options={customers} />);
        expect(screen.getByRole('option', { name: 'Ivan Petrov' })).toBeInTheDocument();
    });

    test('falls back to the mollieId when there is no name', () => {
        render(<CustomersSelect options={customers} />);
        expect(screen.getByRole('option', { name: 'cst_2' })).toBeInTheDocument();
    });

    test('calls onChange with the matching customer object', () => {
        const onChange = jest.fn();
        render(<CustomersSelect options={customers} onChange={onChange} />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });

        expect(onChange).toHaveBeenCalledWith(customers[1]);
    });
});
