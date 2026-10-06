import test from 'node:test';
import assert from 'node:assert/strict';
import { focusContentOnAge, parseAgeBand } from './age-focus';
import { findRepeatedLine } from './grounding-validator';

const ROTTERDAM = 'Rotterdam — Schedule\nMonday:\n- 16:00–17:00 — Kids group — 5–7\n- 17:00–18:00 — Street Jazz / Hip-Hop — 12+\n- 18:00–19:00 — High Heels — 18+';

test('age bands parse from schedule lines', () => {
    assert.deepEqual(parseAgeBand('- 16:00–17:00 — Kids group — 5–7'), { min: 5, max: 7 });
    assert.deepEqual(parseAgeBand('- 18:00–19:00 — High Heels — 18+'), { min: 18, max: Number.POSITIVE_INFINITY });
    assert.equal(parseAgeBand('Rotterdam — Address'), null);
});

test('a 13-year-old only sees the groups their age band allows', () => {
    assert.equal(focusContentOnAge(ROTTERDAM, 13), 'Rotterdam — Schedule\nMonday:\n- 17:00–18:00 — Street Jazz / Hip-Hop — 12+');
    assert.equal(focusContentOnAge(ROTTERDAM, 6), 'Rotterdam — Schedule\nMonday:\n- 16:00–17:00 — Kids group — 5–7');
});

test('day headers left empty are dropped; no matching group leaves the facts untouched', () => {
    const twoDays = 'Den Haag\nWednesday:\n- 18:00–19:00 — Kids group — 7–11\n\nFriday:\n- 19:00–20:00 — High Heels — 18+';
    assert.equal(focusContentOnAge(twoDays, 25), 'Den Haag\nFriday:\n- 19:00–20:00 — High Heels — 18+');
    assert.equal(focusContentOnAge(ROTTERDAM, 3), ROTTERDAM);
    assert.equal(focusContentOnAge('Rotterdam — Address\nVan Alkemadehof 51, 3031 PB', 13), 'Rotterdam — Address\nVan Alkemadehof 51, 3031 PB');
});

test('a looping draft is detected as degenerate repetition', () => {
    const looping = 'Доброго дня!\nВідповідь:\nМені 15 років, хочу записатися.\nВідповідь:\nМені 15 років, хочу записатися.\nВідповідь:\nМені 15 років, хочу записатися.';
    assert.equal(findRepeatedLine(looping), 'Мені 15 років, хочу записатися.');
    assert.equal(findRepeatedLine('Добрый день!\nСпасибо!\nСпасибо!'), null);
});
