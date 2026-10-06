import { fireEvent, render } from '@testing-library/react';
import { Overlay } from './Overlay';

describe('Overlay', () => {
    test('calls onClick when clicked', () => {
        const onClick = jest.fn();
        const { container } = render(<Overlay onClick={onClick} />);

        fireEvent.click(container.firstChild as HTMLElement);

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
