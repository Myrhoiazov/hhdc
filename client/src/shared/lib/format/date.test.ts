import { formatDate, formatDateTime, formatLongDate, formatTime } from './date';

const moment = '2026-03-05T14:07:09';

test('a date is written the way the browser writes dates', () => {
    expect(formatDate(moment)).toBe(new Date(moment).toLocaleDateString());
});

test('a date takes the parts it is asked for', () => {
    expect(formatDate(moment, { year: 'numeric' })).toBe('2026');
});

test('a date with its time keeps both', () => {
    expect(formatDateTime(moment)).toBe(new Date(moment).toLocaleString());
});

test('a time alone leaves the date out', () => {
    expect(formatTime(moment)).toBe(new Date(moment).toLocaleTimeString());
});

test('a long date names the day, the month and the year', () => {
    expect(formatLongDate(moment)).toBe(
        new Date(moment).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    );
});
