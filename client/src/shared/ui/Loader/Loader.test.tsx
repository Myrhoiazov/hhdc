import { render } from '@testing-library/react';
import Loader from './Loader';

describe('Loader', () => {
    test('renders the loader animation', () => {
        const { container } = render(<Loader />);
        expect(container.querySelector('.loader')).toBeInTheDocument();
        expect(container.querySelector('.lds-ellipsis')).toBeInTheDocument();
    });

    test('applies a custom className', () => {
        const { container } = render(<Loader className="extra" />);
        expect(container.querySelector('.loader.extra')).toBeInTheDocument();
    });
});
