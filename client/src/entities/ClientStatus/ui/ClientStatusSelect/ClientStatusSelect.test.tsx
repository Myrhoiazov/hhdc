import { fireEvent, render, screen } from '@testing-library/react';
import { ClientStatusSelect } from './ClientStatusSelect';
import { ClientStatusKey, ClientStatusLabels } from '../../model/types/status';

describe('ClientStatusSelect', () => {
    test('renders every status option except "all"', () => {
        render(<ClientStatusSelect />);

        expect(screen.getByRole('option', { name: ClientStatusLabels.bronze })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: ClientStatusLabels.silver })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: ClientStatusLabels.gold })).toBeInTheDocument();
    });

    test('calls onChange with the selected status', () => {
        const onChange = jest.fn();
        render(<ClientStatusSelect onChange={onChange} />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: ClientStatusKey.gold } });

        expect(onChange).toHaveBeenCalledWith(ClientStatusKey.gold);
    });

    test('disables the select when readonly', () => {
        render(<ClientStatusSelect readonly />);
        expect(screen.getByRole('combobox')).toBeDisabled();
    });
});
