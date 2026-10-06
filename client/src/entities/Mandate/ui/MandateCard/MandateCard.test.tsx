import { fireEvent, render, screen } from '@testing-library/react';
import MandateCard from './MandateCard';
import { Mandate } from '../../model/types/mandate';
import { MollieClient } from '@/entities/MollieClient';

const customers: MollieClient[] = [{ id: '1', givenName: 'Ivan', familyName: 'Petrov' }];

describe('MandateCard', () => {
    test('renders the mandate method select and customers select', () => {
        render(<MandateCard customers={customers} />);
        expect(screen.getByText('Ivan Petrov')).toBeInTheDocument();
    });

    test('calls onChangeDate when the date input changes', () => {
        const onChangeDate = jest.fn();
        render(<MandateCard onChangeDate={onChangeDate} customers={customers} />);

        const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        fireEvent.change(dateInput, { target: { value: '2026-01-15' } });

        expect(onChangeDate).toHaveBeenCalledWith('2026-01-15');
    });

    test('preselects the customer matching the mandate customerId', () => {
        const data: Mandate = { customerId: '1' };
        render(<MandateCard data={data} customers={customers} />);

        expect(screen.getByText('Ivan Petrov')).toBeInTheDocument();
    });
});
