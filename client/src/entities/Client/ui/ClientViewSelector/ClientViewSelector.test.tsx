import { fireEvent, render, screen } from '@testing-library/react';
import { ClientViewSelector } from './ClientViewSelector';
import { ClientView } from '../../model/types/client';

describe('ClientViewSelector', () => {
    test('renders both view buttons', () => {
        render(<ClientViewSelector view={ClientView.BIG} />);
        expect(screen.getByLabelText('Плитка')).toBeInTheDocument();
        expect(screen.getByLabelText('Список')).toBeInTheDocument();
    });

    test('calls onViewClick with the clicked view', () => {
        const onViewClick = jest.fn();
        render(<ClientViewSelector view={ClientView.BIG} onViewClick={onViewClick} />);

        fireEvent.click(screen.getByLabelText('Плитка'));

        expect(onViewClick).toHaveBeenCalledWith(ClientView.SMALL);
    });
});
