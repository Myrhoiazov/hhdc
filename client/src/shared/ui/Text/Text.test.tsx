import { render, screen } from '@testing-library/react';
import { Text } from './Text';

describe('Text', () => {
    test('renders the title as a header and the text as a paragraph', () => {
        render(<Text title="Title" text="Body" />);

        expect(screen.getByTestId('Text.Header')).toHaveTextContent('Title');
        expect(screen.getByTestId('Text.Paragraph')).toHaveTextContent('Body');
    });

    test('renders only the title when there is no text', () => {
        render(<Text title="Title only" />);

        expect(screen.getByTestId('Text.Header')).toBeInTheDocument();
        expect(screen.queryByTestId('Text.Paragraph')).not.toBeInTheDocument();
    });

    test('renders only the text when there is no title', () => {
        render(<Text text="Text only" />);

        expect(screen.queryByTestId('Text.Header')).not.toBeInTheDocument();
        expect(screen.getByTestId('Text.Paragraph')).toBeInTheDocument();
    });

    test('uses an h1 for the l size and h4 for the xs size', () => {
        const { rerender } = render(<Text title="Large" size="l" />);
        expect(screen.getByTestId('Text.Header').tagName).toBe('H1');

        rerender(<Text title="Extra small" size="xs" />);
        expect(screen.getByTestId('Text.Header').tagName).toBe('H4');
    });

    test('applies a custom data-testid prefix', () => {
        render(<Text title="Title" text="Body" data-testid="Custom" />);

        expect(screen.getByTestId('Custom.Header')).toBeInTheDocument();
        expect(screen.getByTestId('Custom.Paragraph')).toBeInTheDocument();
    });
});
