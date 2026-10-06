import { render, screen } from '@testing-library/react';
import MandateItem from './MandateItem';
import { Mandate } from '../../model/types/mandate';

describe('MandateItem', () => {
    test('renders the mandate id, method, and mode', () => {
        const item = { id: 'mnd_1', method: 'directdebit', mode: 'live' } as Mandate;
        render(<MandateItem item={item} />);

        expect(screen.getByText('mnd_1')).toBeInTheDocument();
        expect(screen.getByText('directdebit · live')).toBeInTheDocument();
    });

    test('shows "unknown" when there is no status', () => {
        render(<MandateItem item={{ id: 'mnd_1' } as Mandate} />);
        expect(screen.getByText('unknown')).toBeInTheDocument();
    });

    test('shows the given status', () => {
        render(<MandateItem item={{ id: 'mnd_1', status: 'valid' } as Mandate} />);
        expect(screen.getByText('valid')).toBeInTheDocument();
    });

    test('renders the action returned by renderAction', () => {
        const item = { id: 'mnd_1' } as Mandate;
        render(<MandateItem item={item} renderAction={() => <button>Delete</button>} />);

        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
});
