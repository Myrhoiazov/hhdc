import { act, fireEvent, render, screen } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('renders children when open', () => {
        render(<Modal isOpen><div>content</div></Modal>);
        expect(screen.getByText('content')).toBeInTheDocument();
    });

    test('lazy modal renders nothing until isOpen becomes true', () => {
        const { rerender, queryByText } = render(<Modal lazy isOpen={false}><div>content</div></Modal>);
        expect(queryByText('content')).not.toBeInTheDocument();

        rerender(<Modal lazy isOpen><div>content</div></Modal>);
        expect(screen.getByText('content')).toBeInTheDocument();
    });

    test('calls onClose after the animation delay when the overlay is clicked', () => {
        const onClose = jest.fn();
        render(<Modal isOpen onClose={onClose}><div>content</div></Modal>);

        const overlay = document.querySelector('.overlay') as HTMLElement;
        fireEvent.click(overlay);
        expect(onClose).not.toHaveBeenCalled();

        act(() => {
            jest.advanceTimersByTime(300);
        });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('does not close when clicking the content itself', () => {
        const onClose = jest.fn();
        render(<Modal isOpen onClose={onClose}><div>content</div></Modal>);

        fireEvent.click(screen.getByText('content'));
        act(() => {
            jest.advanceTimersByTime(300);
        });

        expect(onClose).not.toHaveBeenCalled();
    });

    test('calls onClose on Escape keydown while open', () => {
        const onClose = jest.fn();
        render(<Modal isOpen onClose={onClose}><div>content</div></Modal>);

        fireEvent.keyDown(window, { key: 'Escape' });
        act(() => {
            jest.advanceTimersByTime(300);
        });

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
