import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import HeaderDetails from './HeaderDetails';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

beforeEach(() => {
    mockNavigate.mockClear();
});

function renderHeader(onEdit = jest.fn()) {
    return render(
        <MemoryRouter>
            <HeaderDetails userId="1" onEdit={onEdit} />
        </MemoryRouter>,
    );
}

describe('HeaderDetails', () => {
    test('renders the back and edit buttons', () => {
        renderHeader();

        expect(screen.getByRole('button', { name: 'Назад к списку' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Редактировать' })).toBeInTheDocument();
    });

    test('navigates back to the clients list', () => {
        renderHeader();

        fireEvent.click(screen.getByRole('button', { name: 'Назад к списку' }));

        expect(mockNavigate).toHaveBeenCalledWith('/clients');
    });

    test('calls onEdit when the edit button is clicked', () => {
        const onEdit = jest.fn();
        renderHeader(onEdit);

        fireEvent.click(screen.getByRole('button', { name: 'Редактировать' }));

        expect(onEdit).toHaveBeenCalledTimes(1);
    });
});
