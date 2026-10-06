import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReplySubject, resolveReplyRecipient, stripHtmlToText } from './email-smtp.service';

test('buildReplySubject adds a "Re:" prefix when none exists', () => {
    assert.equal(buildReplySubject('Booking question'), 'Re: Booking question');
});

test('buildReplySubject does not double-prefix an already-replied subject', () => {
    assert.equal(buildReplySubject('Re: Booking question'), 'Re: Booking question');
    assert.equal(buildReplySubject('RE: Booking question'), 'RE: Booking question');
});

test('buildReplySubject handles a missing subject gracefully', () => {
    assert.equal(buildReplySubject(null), 'Re:');
    assert.equal(buildReplySubject(undefined), 'Re:');
});

test('stripHtmlToText converts paragraphs and line breaks into newlines', () => {
    assert.equal(
        stripHtmlToText('<p>Hello there</p><p>Second line</p>'),
        'Hello there\nSecond line',
    );
    assert.equal(stripHtmlToText('Line one<br>Line two'), 'Line one\nLine two');
});

test('stripHtmlToText strips tags and decodes common entities', () => {
    assert.equal(
        stripHtmlToText('<strong>Bold</strong> &amp; <em>italic</em> &quot;quoted&quot;'),
        'Bold & italic "quoted"',
    );
});

test('stripHtmlToText collapses excess blank lines', () => {
    assert.equal(
        stripHtmlToText('<p>One</p><p></p><p></p><p>Two</p>'),
        'One\n\nTwo',
    );
});

test('resolveReplyRecipient answers the Reply-To address, not the form sender', () => {
    assert.equal(resolveReplyRecipient({ fromAddress: 'wordpress@talentcenterddc.nl', replyToAddress: 'parent@example.com' }), 'parent@example.com');
});

test('resolveReplyRecipient answers From when there is no Reply-To', () => {
    assert.equal(resolveReplyRecipient({ fromAddress: 'parent@example.com', replyToAddress: null }), 'parent@example.com');
});
