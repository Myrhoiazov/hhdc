import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { ApiError } from '../http';
import { detectImageFormat, processImage } from './image';
import { createLocalStorage, newStorageKey, resolveStoragePath } from './storage';

const photo = (format: 'jpeg' | 'png' | 'webp', width = 2400, height = 1200) => sharp({ create: { width, height, channels: 3, background: '#e8408a' } })
    .withMetadata({ exif: { IFD0: { Copyright: 'secret-location-data' } } })[format]().toBuffer();

test('files are stored under the root and a key can never leave it', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'hhdc-storage-'));
    try {
        const store = createLocalStorage(root);
        const key = newStorageKey('choreographers/abc', 'webp');
        await store.put(key, Buffer.from('content'));
        assert.equal((await store.read(key)).toString(), 'content');
        assert.equal((await readFile(path.join(root, key))).toString(), 'content');
        await assert.rejects(store.put(key, Buffer.from('again')));
        await store.remove(key);
        await assert.rejects(store.read(key));
        for (const bad of ['../escape.txt', '/etc/passwd', 'a/../../b', 'a//b', 'A/Upper.png', '']) {
            assert.throws(() => resolveStoragePath(root, bad), /Invalid storage key/, bad);
        }
    } finally { await rm(root, { recursive: true, force: true }); }
});

test('the image format is read from the bytes, not from a name or a declared type', async () => {
    assert.equal(detectImageFormat(await photo('jpeg')), 'jpeg');
    assert.equal(detectImageFormat(await photo('png')), 'png');
    assert.equal(detectImageFormat(await photo('webp')), 'webp');
    assert.equal(detectImageFormat(Buffer.from('MZ\x90\x00 this is an executable renamed to photo.jpg')), null);
    assert.equal(detectImageFormat(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
});

test('a photo yields a display and a thumbnail variant without metadata', async () => {
    const original = await photo('jpeg');
    const processed = await processImage(original);
    assert.deepEqual([processed.format, processed.width, processed.height], ['jpeg', 2400, 1200]);
    const display = await sharp(processed.display).metadata();
    const thumb = await sharp(processed.thumb).metadata();
    assert.deepEqual([display.format, display.width, display.height], ['webp', 1600, 800]);
    assert.deepEqual([thumb.width, thumb.height], [400, 200]);
    assert.equal(display.exif, undefined);
    assert.ok(!processed.display.includes('secret-location-data'));
});

test('a disguised or broken file is rejected', async () => {
    const rejected = (error: unknown) => error instanceof ApiError && error.code === 'IMAGE_REJECTED';
    await assert.rejects(processImage(Buffer.from('MZ not an image')), rejected);
    // JPEG signature followed by garbage: passes the signature check, fails decoding.
    await assert.rejects(processImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('garbage garbage garbage')])), rejected);
    await assert.rejects(processImage(Buffer.alloc(10 * 1024 * 1024 + 1, 1)), rejected);
});
