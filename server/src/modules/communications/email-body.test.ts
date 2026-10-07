import { test } from 'node:test';
import assert from 'node:assert/strict';
import { footerToText, renderEmailBody, sanitizeFooterHtml } from './email-body';

const footer = '<div>\n<img alt="HHDC" width="200" src="https://example.test/logo.png" />\n<p><b>Kind regards,</b></p>\n<h3>High Heels Dance Camp / Team</h3>\n<p>Instagram: <a style="color: #e8408a;" href="https://example.test/insta" target="_blank">link</a></p>\n<p><a href="https://highheelsdancecamp.com" target="_blank">www.highheelsdancecamp.com</a></p>\n</div>';

test('an email without a footer stays plain text', () => {
    assert.deepEqual(renderEmailBody('Hi Anna', undefined), { text: 'Hi Anna' });
    assert.deepEqual(renderEmailBody('Hi Anna', '  '), { text: 'Hi Anna' });
});

test('the reply is escaped, line breaks are kept and the footer follows it', () => {
    const body = renderEmailBody('Hi <Anna>,\nPrice: €390 & more', footer);
    assert.match(body.html ?? '', /^<div>Hi &lt;Anna&gt;,<br>\nPrice: €390 &amp; more<\/div>\n<br>\n<div>/);
    assert.match(body.html ?? '', /<img alt="HHDC" width="200" src="https:\/\/example\.test\/logo\.png" \/>/);
    assert.equal(body.text, 'Hi <Anna>,\nPrice: €390 & more\n\nKind regards,\nHigh Heels Dance Camp / Team\nInstagram: link (https://example.test/insta)\nhttps://highheelsdancecamp.com');
});

test('the plain-text footer writes links out and drops images', () => {
    assert.equal(footerToText('<p>TikTok: <a href="https://example.test/tt">link</a></p><img src="x.png"><p>A &amp; B</p>'), 'TikTok: link (https://example.test/tt)\nA & B');
});

test('anything that can run code is removed from the footer', () => {
    const cleaned = sanitizeFooterHtml('<p onclick="steal()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="https://example.test/a.png" onerror=alert(1)><iframe src="https://evil.test"></iframe>');
    assert.equal(cleaned, '<p>Hi</p><a href="#">x</a><img src="https://example.test/a.png">');
});

test('a footer formatted over several lines still yields one line per block with its links', () => {
    const formatted = '<div>\n    <p>\n        Instagram:\n        <a\n            style="color: #e8408a;"\n            href="https://example.test/insta"\n            target="_blank"\n            >link</a\n        >\n    </p>\n    <p>\n        <a\n            href="https://highheelsdancecamp.com"\n            >www.highheelsdancecamp.com</a\n        >\n    </p>\n</div>';
    assert.equal(footerToText(formatted), 'Instagram: link (https://example.test/insta)\nhttps://highheelsdancecamp.com');
    assert.equal(sanitizeFooterHtml(formatted), formatted);
});
