import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfirmDelete } from './ConfirmDelete';

const ask = () => fireEvent.click(screen.getByRole('button', { name: 'Delete Anna' }));
const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Delete for good' }));

test('the first press only asks', () => {
    const onDelete = jest.fn();
    render(<ConfirmDelete label="Delete Anna" onDelete={onDelete} />);

    ask();

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete for good' })).toBeInTheDocument();
});

test('the second press deletes', async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    render(<ConfirmDelete label="Delete Anna" onDelete={onDelete} />);

    ask();
    confirm();

    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
});

test('cancelling goes back without deleting', () => {
    const onDelete = jest.fn();
    render(<ConfirmDelete label="Delete Anna" onDelete={onDelete} />);

    ask();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete Anna' })).toBeInTheDocument();
});

test('a refusal is shown next to the buttons when nobody takes it', async () => {
    render(<ConfirmDelete label="Delete Anna" onDelete={jest.fn().mockRejectedValue(new Error('Has orders'))} />);

    ask();
    confirm();

    expect(await screen.findByRole('alert')).toHaveTextContent('Has orders');
});

test('a refusal is handed to the owner and the question is closed', async () => {
    const onError = jest.fn();
    render(<ConfirmDelete label="Delete Anna" onDelete={jest.fn().mockRejectedValue(new Error('Has orders'))} onError={onError} />);

    ask();
    confirm();

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Has orders'));
    expect(screen.getByRole('button', { name: 'Delete Anna' })).toBeInTheDocument();
});
