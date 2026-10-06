import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { ChoreographerModal } from './ChoreographerModal';
import { Choreographer } from '../ChoreographerCard/ChoreographerCard';

jest.mock('@/shared/api/api', () => ({
    $apiPrivate: { post: jest.fn(), put: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('ChoreographerModal', () => {
    test('renders the create title with empty fields', () => {
        render(<ChoreographerModal isOpen onClose={() => {}} onSaved={() => {}} />);
        expect(screen.getByText('СОЗДАТЬ ХОРЕОГРАФА')).toBeInTheDocument();
    });

    test('prefills the RU name fields when editing', () => {
        const choreographer: Choreographer = { id: 1, firstName: 'Ivan', lastName: 'Petrov', showOnSite: true };
        render(<ChoreographerModal isOpen onClose={() => {}} onSaved={() => {}} editChoreographer={choreographer} />);

        expect(screen.getByText('РЕДАКТИРОВАТЬ ХОРЕОГРАФА')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Ivan')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Petrov')).toBeInTheDocument();
    });

    test('rejects saving without a RU first/last name', () => {
        render(<ChoreographerModal isOpen onClose={() => {}} onSaved={() => {}} />);

        fireEvent.click(screen.getByText('Создать'));

        expect(toast.error).toHaveBeenCalledWith('Укажите имя и фамилию (RU)');
        expect($apiPrivate.post).not.toHaveBeenCalled();
    });

    test('switching the language tab edits a different name field', () => {
        render(<ChoreographerModal isOpen onClose={() => {}} onSaved={() => {}} />);

        const firstNameInput = screen.getAllByRole('textbox')[0];
        fireEvent.change(firstNameInput, { target: { value: 'Ivan' } });
        fireEvent.click(screen.getByText('UA'));

        // the UA first-name input starts empty, independent from the RU one
        expect(screen.queryByDisplayValue('Ivan')).not.toBeInTheDocument();
    });

    test('creates a new choreographer with the selected category', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({});
        const onSaved = jest.fn();
        render(<ChoreographerModal isOpen onClose={() => {}} onSaved={onSaved} />);

        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0], { target: { value: 'Ivan' } });
        fireEvent.change(inputs[1], { target: { value: 'Petrov' } });
        fireEvent.click(screen.getByText('Pro'));
        fireEvent.click(screen.getByText('Создать'));

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect($apiPrivate.post).toHaveBeenCalledWith(
            '/schedule/choreographers',
            expect.objectContaining({ firstName: 'Ivan', lastName: 'Petrov', category: 'PRO' }),
        );
        expect(toast.success).toHaveBeenCalledWith('Хореограф создан');
    });
});
