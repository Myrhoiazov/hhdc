import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RichTextEditor } from './RichTextEditor';

// jsdom has no layout engine: ProseMirror calls Range#getClientRects() and
// Range#getBoundingClientRect() while scrolling the selection into view after
// transactions. jsdom does not implement these on Range, so provide empty
// geometry to keep the editor usable under test.
beforeAll(() => {
    const emptyRectList = () => ({
        length: 0,
        item: () => null,
        [Symbol.iterator]: function* emptyRectsIterator() {},
    });
    const emptyRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) });

    if (typeof Range !== 'undefined') {
        if (!Range.prototype.getClientRects) {
            Object.defineProperty(Range.prototype, 'getClientRects', {
                configurable: true,
                value: emptyRectList,
            });
        }
        if (!Range.prototype.getBoundingClientRect) {
            Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
                configurable: true,
                value: emptyRect,
            });
        }
    }
});

describe('RichTextEditor', () => {
    test('renders the toolbar buttons', async () => {
        render(<RichTextEditor value="<p>hello</p>" onChange={() => {}} />);

        expect(screen.getByLabelText('Жирный')).toBeInTheDocument();
        expect(screen.getByLabelText('Курсив')).toBeInTheDocument();
        expect(screen.getByLabelText('Маркированный список')).toBeInTheDocument();
        expect(screen.getByLabelText('Нумерованный список')).toBeInTheDocument();
        expect(screen.getByLabelText('Ссылка')).toBeInTheDocument();
    });

    test('renders the initial content once the editor mounts', async () => {
        render(<RichTextEditor value="<p>hello</p>" onChange={() => {}} />);

        await waitFor(() => {
            expect(screen.getByText('hello')).toBeInTheDocument();
        });
    });

    test('toggles the bold toolbar button active state on click', async () => {
        render(<RichTextEditor value="<p>hello</p>" onChange={() => {}} />);

        await waitFor(() => screen.getByText('hello'));

        const boldButton = screen.getByLabelText('Жирный');
        fireEvent.click(boldButton);

        await waitFor(() => {
            expect(boldButton.className).toMatch(/toolbarBtnActive/);
        });
    });
});
