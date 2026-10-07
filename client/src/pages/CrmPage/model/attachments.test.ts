import { addAttachments, formatFileSize, MAX_ATTACHMENT_BYTES } from './attachments';

const file = (name: string, size = 3) => {
    const created = new File(['x'], name);
    Object.defineProperty(created, 'size', { value: size });
    return created;
};

test('picked files are added once', () => {
    const price = file('price.pdf');
    const result = addAttachments([price], [file('price.pdf'), file('map.png'), file('map.png')]);
    expect(result.files.map((item) => item.name)).toEqual(['price.pdf', 'map.png']);
    expect(result.error).toBe('');
});

test('an oversized file is left out with a reason', () => {
    const result = addAttachments([], [file('video.mov', MAX_ATTACHMENT_BYTES + 1), file('map.png')]);
    expect(result.files.map((item) => item.name)).toEqual(['map.png']);
    expect(result.error).toBe('A file larger than 10 MB cannot be attached');
});

test('only five files are kept', () => {
    const result = addAttachments([], ['a', 'b', 'c', 'd', 'e', 'f'].map((name) => file(name)));
    expect(result.files).toHaveLength(5);
    expect(result.error).toBe('No more than 5 files can be attached');
});

test('file sizes are shown in KB and MB', () => {
    expect(formatFileSize(300)).toBe('1 KB');
    expect(formatFileSize(20480)).toBe('20 KB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
});
