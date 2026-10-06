import { fireEvent, render, screen } from '@testing-library/react';
import { RoleSelect } from './RoleSelect';
import { RoleKey, RoleLabels } from '../../model/types/role';

describe('RoleSelect', () => {
    test('renders every role option', () => {
        render(<RoleSelect />);

        expect(screen.getByRole('option', { name: RoleLabels.ADMIN })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: RoleLabels.MANAGER })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: RoleLabels.GUEST })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: RoleLabels.DOCTOR })).toBeInTheDocument();
    });

    test('calls onChange with the selected role', () => {
        const onChange = jest.fn();
        render(<RoleSelect onChange={onChange} />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: RoleKey.MANAGER } });

        expect(onChange).toHaveBeenCalledWith(RoleKey.MANAGER);
    });
});
