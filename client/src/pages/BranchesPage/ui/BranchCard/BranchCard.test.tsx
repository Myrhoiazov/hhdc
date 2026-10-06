import { fireEvent, render, screen } from '@testing-library/react';
import { BranchCard, Branch } from './BranchCard';

const branch: Branch = { id: 1, name: 'Central', city: 'Kyiv', address: 'Khreshchatyk 1', phone: '+380501234567', email: 'central@ddc.com', isActive: true };

describe('BranchCard', () => {
    test('renders the branch name, address, and contacts', () => {
        render(<BranchCard branch={branch} onEdit={() => {}} onDelete={() => {}} />);

        expect(screen.getByText('Central')).toBeInTheDocument();
        expect(screen.getByText('Kyiv, Khreshchatyk 1')).toBeInTheDocument();
        expect(screen.getByText('+380501234567')).toBeInTheDocument();
        expect(screen.getByText('central@ddc.com')).toBeInTheDocument();
    });

    test('shows the active status', () => {
        render(<BranchCard branch={branch} onEdit={() => {}} onDelete={() => {}} />);
        expect(screen.getByText('Активен')).toBeInTheDocument();
    });

    test('shows the inactive status', () => {
        render(<BranchCard branch={{ ...branch, isActive: false }} onEdit={() => {}} onDelete={() => {}} />);
        expect(screen.getByText('Неактивен')).toBeInTheDocument();
    });

    test('calls onEdit with the branch when the edit button is clicked', () => {
        const onEdit = jest.fn();
        render(<BranchCard branch={branch} onEdit={onEdit} onDelete={() => {}} />);

        fireEvent.click(screen.getByTitle('Редактировать'));

        expect(onEdit).toHaveBeenCalledWith(branch);
    });

    test('calls onDelete with the branch id when the delete button is clicked', () => {
        const onDelete = jest.fn();
        render(<BranchCard branch={branch} onEdit={() => {}} onDelete={onDelete} />);

        fireEvent.click(screen.getByTitle('Удалить'));

        expect(onDelete).toHaveBeenCalledWith(1);
    });
});
