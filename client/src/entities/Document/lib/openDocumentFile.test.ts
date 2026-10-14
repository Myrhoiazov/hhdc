import { fetchDocumentFile } from '../api/documentApi';
import { openDocumentFile } from './openDocumentFile';

jest.mock('../api/documentApi', () => ({ fetchDocumentFile: jest.fn() }));

beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(fetchDocumentFile).mockResolvedValue(new Blob(['%PDF']));
    URL.createObjectURL = jest.fn(() => 'blob:document');
    URL.revokeObjectURL = jest.fn();
    window.open = jest.fn();
});
afterEach(() => { jest.useRealTimers(); });

test('the file is fetched with the session and opened in a new tab', async () => {
    await openDocumentFile('doc-1', 2);

    expect(fetchDocumentFile).toHaveBeenCalledWith('doc-1', 2);
    expect(window.open).toHaveBeenCalledWith('blob:document', '_blank', 'noopener');
});

test('the address of the file is released a minute later', async () => {
    await openDocumentFile('doc-1');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    jest.advanceTimersByTime(60_000);

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:document');
});
