import { render } from '@testing-library/react';
import { PageLoader } from './PageLoader';

describe('PageLoader', () => {
    test('renders the loader', () => {
        const { container } = render(<PageLoader />);
        expect(container.querySelector('.loader')).toBeInTheDocument();
    });
});
