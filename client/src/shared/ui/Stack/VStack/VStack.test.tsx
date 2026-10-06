import { render, screen } from '@testing-library/react';
import { VStack } from './VStack';

describe('VStack', () => {
    test('renders its children in a column', () => {
        const { container } = render(<VStack>content</VStack>);
        expect(screen.getByText('content')).toBeInTheDocument();
        expect((container.firstChild as HTMLElement).className).toMatch(/directionColumn/);
    });

    test('defaults align to start', () => {
        const { container } = render(<VStack>content</VStack>);
        expect((container.firstChild as HTMLElement).className).toMatch(/alignStart/);
    });
});
