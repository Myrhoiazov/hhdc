import { act, render, screen } from '@testing-library/react';
import { fromAny } from '@total-typescript/shoehorn';
import { AppImage } from './AppImage';

class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private _src = '';

    set src(value: string) {
        this._src = value;
    }

    get src() {
        return this._src;
    }
}

let instances: MockImage[] = [];

beforeEach(() => {
    instances = [];
    global.Image = fromAny(class extends MockImage {
        constructor() {
            super();
            instances.push(this);
        }
    });
});

describe('AppImage', () => {
    test('renders the fallback while the image is loading', () => {
        render(<AppImage src="/photo.png" fallback={<div data-testid="fallback">loading</div>} />);
        expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });

    test('renders the img once loading succeeds', () => {
        render(<AppImage src="/photo.png" alt="Photo" fallback={<div data-testid="fallback">loading</div>} />);

        act(() => {
            instances[0].onload?.();
        });

        expect(screen.getByAltText('Photo')).toBeInTheDocument();
        expect(screen.queryByTestId('fallback')).not.toBeInTheDocument();
    });

    test('renders the errorFallback when the image fails to load', () => {
        render(
            <AppImage
                src="/broken.png"
                errorFallback={<div data-testid="error-fallback">broken</div>}
            />,
        );

        act(() => {
            instances[0].onerror?.();
        });

        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
    });

    test('renders a plain img with no fallback props', () => {
        render(<AppImage src="/photo.png" alt="Photo" />);
        expect(screen.getByAltText('Photo')).toBeInTheDocument();
    });
});
