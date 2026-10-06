import { render } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
    test('applies the given width, height, and border radius as inline styles', () => {
        const { container } = render(<Skeleton width={100} height="2rem" border="8px" />);
        const el = container.firstChild as HTMLElement;

        expect(el).toHaveStyle({ width: '100px', height: '2rem', borderRadius: '8px' });
    });
});
