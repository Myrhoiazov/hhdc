import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
    test('renders its children', () => {
        render(<Card>content</Card>);
        expect(screen.getByText('content')).toBeInTheDocument();
    });

    test('forwards native div attributes', () => {
        render(<Card data-testid="card" onClick={() => {}}>content</Card>);
        expect(screen.getByTestId('card')).toBeInTheDocument();
    });
});
