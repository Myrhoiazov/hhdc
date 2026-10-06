import { fireEvent, render, screen } from '@testing-library/react';
import { CountrySelect } from './CountrySelect';
import { Country } from '../../model/types/country';

describe('CountrySelect', () => {
    test('renders every country option', () => {
        render(<CountrySelect />);

        Object.values(Country).forEach((country) => {
            expect(screen.getByRole('option', { name: country })).toBeInTheDocument();
        });
    });

    test('calls onChange with the selected country', () => {
        const onChange = jest.fn();
        render(<CountrySelect onChange={onChange} />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: Country.Ukraine } });

        expect(onChange).toHaveBeenCalledWith(Country.Ukraine);
    });
});
