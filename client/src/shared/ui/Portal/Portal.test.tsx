import { render, screen } from '@testing-library/react';
import { Portal } from './Portal';

describe('Portal', () => {
    test('renders children into document.body by default', () => {
        render(<Portal><div data-testid="portal-content">hi</div></Portal>);

        expect(screen.getByTestId('portal-content').parentElement).toBe(document.body);
    });

    test('renders children into a custom element when provided', () => {
        const customElement = document.createElement('div');
        document.body.appendChild(customElement);

        render(<Portal element={customElement}><div data-testid="portal-content">hi</div></Portal>);

        expect(screen.getByTestId('portal-content').parentElement).toBe(customElement);

        document.body.removeChild(customElement);
    });
});
