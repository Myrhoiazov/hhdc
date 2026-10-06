import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EmailComposer } from './EmailComposer';

describe('EmailComposer', () => {
    test('renders the toolbar and the send button disabled while empty', async () => {
        render(<EmailComposer onSend={jest.fn()} />);

        await waitFor(() => {
            expect(screen.getByLabelText('Жирный')).toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled();
    });

    test('uses the custom send label when provided', async () => {
        render(<EmailComposer onSend={jest.fn()} sendLabel="Ответить" />);
        expect(await screen.findByRole('button', { name: 'Ответить' })).toBeInTheDocument();
    });

    test('disables the attach button once the max number of files is reached', async () => {
        render(<EmailComposer onSend={jest.fn()} />);
        await waitFor(() => screen.getByLabelText('Жирный'));

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const files = Array.from({ length: 5 }, (_, i) => new File(['x'], `file${i}.txt`));
        fireEvent.change(fileInput, { target: { files } });

        await waitFor(() => {
            expect(screen.getByText('file0.txt')).toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: /Прикрепить файл/ })).toBeDisabled();
    });

    test('shows an error when a file exceeds the size limit', async () => {
        render(<EmailComposer onSend={jest.fn()} />);
        await waitFor(() => screen.getByLabelText('Жирный'));

        const bigFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'big.txt');
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(fileInput, { target: { files: [bigFile] } });

        expect(await screen.findByText('Файл "big.txt" больше 10 МБ')).toBeInTheDocument();
    });

    test('removes an attached file when its remove button is clicked', async () => {
        render(<EmailComposer onSend={jest.fn()} />);
        await waitFor(() => screen.getByLabelText('Жирный'));

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(fileInput, { target: { files: [new File(['x'], 'file.txt')] } });
        await waitFor(() => screen.getByText('file.txt'));

        fireEvent.click(screen.getByLabelText('Убрать файл'));

        expect(screen.queryByText('file.txt')).not.toBeInTheDocument();
    });
});
