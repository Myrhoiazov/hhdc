import { saveFile } from './saveFile';

test('the file is offered for download under its name and its address is released', () => {
    const click = jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);
    URL.createObjectURL = jest.fn(() => 'blob:export');
    URL.revokeObjectURL = jest.fn();

    saveFile('people.csv', 'name\nAnna', 'text/csv;charset=utf-8');

    const blob = jest.mocked(URL.createObjectURL).mock.calls[0][0];
    expect(blob).toHaveProperty('type', 'text/csv;charset=utf-8');
    // jsdom's Blob cannot be read back; its size shows the text went in.
    expect(blob).toHaveProperty('size', 'name\nAnna'.length);
    expect(click.mock.contexts[0]).toHaveProperty('download', 'people.csv');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export');
    click.mockRestore();
});
