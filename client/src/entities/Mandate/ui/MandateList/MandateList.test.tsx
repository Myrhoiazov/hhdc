import { render, screen } from '@testing-library/react';
import { MandateList } from './MandateList';
import { Mandate } from '../../model/types/mandate';

describe('MandateList', () => {
    test('shows an empty state when there are no mandates and it is not loading', () => {
        render(<MandateList mandates={[]} />);
        expect(screen.getByText('Мандаты не найдены')).toBeInTheDocument();
    });

    test('renders a MandateItem for each mandate', () => {
        const mandates = [{ id: 'mnd_1' }, { id: 'mnd_2' }] as Mandate[];
        render(<MandateList mandates={mandates} />);

        expect(screen.getByText('mnd_1')).toBeInTheDocument();
        expect(screen.getByText('mnd_2')).toBeInTheDocument();
    });

    test('renders a loading skeleton when isLoading is true', () => {
        const { container } = render(<MandateList mandates={[]} isLoading />);
        expect(container.querySelectorAll('.Skeleton')).toHaveLength(4);
    });
});
