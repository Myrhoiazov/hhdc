import { render, screen } from '@testing-library/react';
import { Flex } from './Flex';

describe('Flex', () => {
    test('renders its children', () => {
        render(<Flex direction="row">content</Flex>);
        expect(screen.getByText('content')).toBeInTheDocument();
    });

    test('applies the row direction class by default', () => {
        const { container } = render(<Flex direction="row">content</Flex>);
        expect((container.firstChild as HTMLElement).className).toMatch(/directionRow/);
    });

    test('applies the column direction class', () => {
        const { container } = render(<Flex direction="column">content</Flex>);
        expect((container.firstChild as HTMLElement).className).toMatch(/directionColumn/);
    });
});
