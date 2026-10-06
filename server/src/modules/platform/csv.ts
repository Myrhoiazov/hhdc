// Minimal RFC 4180 CSV reader/writer for import previews and exports.
const parseLine = (state: { rows: string[][]; row: string[]; cell: string; quoted: boolean }, char: string, next: string | undefined) => {
    if (state.quoted) {
        if (char === '"' && next === '"') return { ...state, cell: `${state.cell}"`, skip: true };
        return char === '"' ? { ...state, quoted: false } : { ...state, cell: state.cell + char };
    }
    if (char === '"') return { ...state, quoted: true };
    if (char === ',') return { ...state, row: [...state.row, state.cell], cell: '' };
    if (char === '\n') return { ...state, rows: [...state.rows, [...state.row, state.cell]], row: [], cell: '' };
    return char === '\r' ? state : { ...state, cell: state.cell + char };
};

export const parseCsv = (text: string): string[][] => {
    let state: { rows: string[][]; row: string[]; cell: string; quoted: boolean; skip?: boolean } = { rows: [], row: [], cell: '', quoted: false };
    const input = text.replace(/^﻿/, '');
    for (let index = 0; index < input.length; index += 1) {
        state = parseLine(state, input[index], input[index + 1]);
        if (state.skip) { index += 1; state.skip = false; }
    }
    if (state.quoted) throw new Error('CSV has an unterminated quoted value');
    const rows = state.cell || state.row.length ? [...state.rows, [...state.row, state.cell]] : state.rows;
    return rows.filter(row => row.some(cell => cell.trim() !== ''));
};

// Cells starting with a formula trigger are neutralised so spreadsheets do not execute exported data.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
const escapeCell = (value: unknown) => {
    const raw = value === null || value === undefined ? '' : value instanceof Date ? value.toISOString() : String(value);
    const safe = FORMULA_TRIGGER.test(raw) ? `'${raw}` : raw;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const toCsv = (columns: string[], rows: Record<string, unknown>[]) =>
    [columns.map(escapeCell).join(','), ...rows.map(row => columns.map(column => escapeCell(row[column])).join(','))].join('\r\n');
