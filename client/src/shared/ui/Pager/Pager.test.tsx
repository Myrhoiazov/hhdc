import { fireEvent, render, screen } from '@testing-library/react';
import { LIST_PAGE_SIZE } from '@/shared/const/pagination';
import { Pager } from './Pager';

test('a list that fits on one page has no pager', () => {
    const { container } = render(<Pager page={1} total={LIST_PAGE_SIZE} onChange={jest.fn()} />);

    expect(container).toBeEmptyDOMElement();
});

test('the pager steps to the next and the previous page', () => {
    const onChange = jest.fn();
    render(<Pager page={2} total={LIST_PAGE_SIZE * 3} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));

    expect(onChange.mock.calls).toEqual([[3], [1]]);
});

test('there is no way before the first page or past the last one', () => {
    const { rerender } = render(<Pager page={1} total={30} pageSize={10} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();

    rerender(<Pager page={3} total={30} pageSize={10} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
});
