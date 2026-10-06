import { fireEvent, render, screen } from '@testing-library/react';
import { Icon } from './Icon';

const MockSvg = (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="mock-svg" {...props} />;

describe('Icon', () => {
    test('renders the given Svg with default size', () => {
        render(<Icon Svg={MockSvg} />);

        const svg = screen.getByTestId('mock-svg');
        expect(svg).toHaveAttribute('width', '32');
        expect(svg).toHaveAttribute('height', '32');
    });

    test('renders as plain svg (not a button) when not clickable', () => {
        const { container } = render(<Icon Svg={MockSvg} />);
        expect(container.querySelector('button')).not.toBeInTheDocument();
    });

    test('renders inside a button and calls onClick when clickable', () => {
        const onClick = jest.fn();
        render(<Icon Svg={MockSvg} clickable onClick={onClick} />);

        const button = screen.getByRole('button');
        expect(button).toContainElement(screen.getByTestId('mock-svg'));

        fireEvent.click(button);
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('applies a custom width and height', () => {
        render(<Icon Svg={MockSvg} width={16} height={16} />);

        const svg = screen.getByTestId('mock-svg');
        expect(svg).toHaveAttribute('width', '16');
        expect(svg).toHaveAttribute('height', '16');
    });
});
