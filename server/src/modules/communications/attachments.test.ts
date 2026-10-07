import { test } from 'node:test';
import assert from 'node:assert/strict';
import multer from 'multer';
import { ApiError } from '../../common/http';
import { attachmentSummary, cleanFilename, toAttachments, uploadError } from './attachments';

test('an uploaded file name loses its path, quotes and line breaks', () => {
    assert.equal(cleanFilename('../../etc/passwd'), 'passwd');
    assert.equal(cleanFilename('Program"\r\nBcc: x@example.test.pdf'), 'ProgramBcc: x@example.test.pdf');
    assert.equal(cleanFilename('Расписание.pdf'), 'Расписание.pdf');
    assert.equal(cleanFilename('  '), 'attachment');
});

test('uploaded files become attachments and only their summary is kept', () => {
    const attachments = toAttachments([{ originalname: 'a/price.pdf', mimetype: 'application/pdf', buffer: Buffer.from('12345') }]);
    assert.deepEqual(attachments, [{ filename: 'price.pdf', contentType: 'application/pdf', content: Buffer.from('12345') }]);
    assert.deepEqual(attachmentSummary(attachments), [{ filename: 'price.pdf', contentType: 'application/pdf', size: 5 }]);
    assert.deepEqual(toAttachments(undefined), []);
});

test('upload limits are reported as client errors, other failures are passed on', () => {
    const tooBig = uploadError(new multer.MulterError('LIMIT_FILE_SIZE'));
    assert.ok(tooBig instanceof ApiError);
    assert.equal(tooBig.status, 413);
    const tooMany = uploadError(new multer.MulterError('LIMIT_FILE_COUNT'));
    assert.ok(tooMany instanceof ApiError);
    assert.equal(tooMany.status, 400);
    const other = new Error('socket closed');
    assert.equal(uploadError(other), other);
});
