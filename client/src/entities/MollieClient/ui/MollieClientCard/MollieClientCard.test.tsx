import { fireEvent, render, screen } from '@testing-library/react';
import MollieClientCard from './MollieClientCard';
import { MollieClient } from '../../model/types/mollieClient';

describe('MollieClientCard', () => {
    test('renders the current field values', () => {
        const data: MollieClient = { mollieId: 'cst_1', givenName: 'Ivan', familyName: 'Petrov' };
        render(<MollieClientCard data={data} />);

        expect(screen.getByDisplayValue('cst_1')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Ivan')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Petrov')).toBeInTheDocument();
    });

    test('the mollieId field is always readonly', () => {
        render(<MollieClientCard data={{ mollieId: 'cst_1' }} />);
        expect(screen.getByDisplayValue('cst_1')).toHaveAttribute('readOnly');
    });

    test('calls onChangeFirstName when the first name input changes', () => {
        const onChangeFirstName = jest.fn();
        render(<MollieClientCard onChangeFirstName={onChangeFirstName} />);

        fireEvent.change(screen.getByPlaceholderText('Имя'), { target: { value: 'Petr' } });

        expect(onChangeFirstName).toHaveBeenCalledWith('Petr');
    });

    test('renders the preferred language options', () => {
        render(<MollieClientCard />);
        expect(screen.getByRole('option', { name: 'Русский' })).toBeInTheDocument();
    });
});
