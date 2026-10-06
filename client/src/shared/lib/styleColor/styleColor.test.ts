import { getStyleColorSlot, STYLE_COLOR_SLOTS } from './styleColor';

describe('getStyleColorSlot', () => {
    test('returns a slot within the valid range', () => {
        const slot = getStyleColorSlot('Hip-Hop');
        expect(slot).toBeGreaterThanOrEqual(1);
        expect(slot).toBeLessThanOrEqual(STYLE_COLOR_SLOTS);
    });

    test('is deterministic for the same name', () => {
        expect(getStyleColorSlot('Contemporary')).toBe(getStyleColorSlot('Contemporary'));
    });

    test('returns a valid slot for an empty string', () => {
        const slot = getStyleColorSlot('');
        expect(slot).toBeGreaterThanOrEqual(1);
        expect(slot).toBeLessThanOrEqual(STYLE_COLOR_SLOTS);
    });

    test('different names can map to different slots', () => {
        const names = ['Ballet', 'Jazz', 'Breakdance', 'Salsa', 'Tango', 'Vogue', 'Krump', 'House'];
        const slots = new Set(names.map(getStyleColorSlot));
        expect(slots.size).toBeGreaterThan(1);
    });
});
