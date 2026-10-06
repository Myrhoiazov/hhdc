import { act, render, screen } from '@testing-library/react';
import { fromAny } from '@total-typescript/shoehorn';
import { Avatar } from './Avatar';

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

describe('Avatar', () => {
    test('renders a skeleton fallback while the image is loading', () => {
        const { container } = render(<Avatar src="/avatar.png" />);
        expect(container.querySelector('[class*="Skeleton"]')).toBeInTheDocument();
    });

    test('renders the image once loaded', () => {
        render(<Avatar src="/avatar.png" alt="User avatar" />);

        act(() => {
            instances[0].onload?.();
        });

        expect(screen.getByAltText('User avatar')).toBeInTheDocument();
    });

    test('stops showing the loading skeleton and does not render an img on error', () => {
        const { container } = render(<Avatar src="/broken.png" />);

        act(() => {
            instances[0].onerror?.();
        });

        expect(container.querySelector('.Skeleton')).not.toBeInTheDocument();
        expect(container.querySelector('img')).not.toBeInTheDocument();
    });

    test('applies the given size', () => {
        render(<Avatar src="/avatar.png" alt="User avatar" size={64} />);

        act(() => {
            instances[0].onload?.();
        });

        expect(screen.getByAltText('User avatar')).toHaveStyle({ width: '64px', height: '64px' });
    });
});
