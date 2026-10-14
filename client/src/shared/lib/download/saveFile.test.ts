import { saveFile } from './saveFile';

test('the file is offered for download under its name and its address is released', () => {
    const click = jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);
    URL.createObjectURL = jest.fn(() => 'blob:export');
    URL.revokeObjectURL = jest.fn();

    saveFile('people.csv', 'name\nAnna', 'text/csv;charset=utf-8');

    const blob = jest.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8');
    // jsdom's Blob cannot be read back; its size shows the text went in.
    expect(blob.size).toBe('name\nAnna'.length);
    expect((click.mock.instances[0] as unknown as HTMLAnchorElement).download).toBe('people.csv');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export');
    click.mockRestore();
});
