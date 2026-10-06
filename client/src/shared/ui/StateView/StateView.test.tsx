import { render, screen } from '@testing-library/react';
import { StateView } from './StateView';

describe('StateView', () => {
    test('renders the title, text, and action', () => {
        render(<StateView title="No data" text="Nothing here yet" action={<button>Retry</button>} />);

        expect(screen.getByText('No data')).toBeInTheDocument();
        expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    test('renders a custom icon when given', () => {
        render(<StateView icon={<span data-testid="custom-icon" />} />);
        expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    test('renders animated dots for the loading tone with no custom icon', () => {
        const { container } = render(<StateView tone="loading" />);
        expect(container.querySelector('[class*="dots"]')).toBeInTheDocument();
    });
});
