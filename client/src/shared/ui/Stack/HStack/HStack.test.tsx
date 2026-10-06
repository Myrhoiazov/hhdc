import { render, screen } from '@testing-library/react';
import { HStack } from './HStack';

describe('HStack', () => {
    test('renders its children in a row', () => {
        const { container } = render(<HStack>content</HStack>);
        expect(screen.getByText('content')).toBeInTheDocument();
        expect((container.firstChild as HTMLElement).className).toMatch(/directionRow/);
    });
});
