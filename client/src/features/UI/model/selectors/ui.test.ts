import { StateSchema } from '@/app/providers/StoreProvider';
import { getUIScroll, getUIScrollByPath } from './ui';

describe('UI selectors', () => {
    test('getUIScroll returns the scroll map', () => {
        const scroll = { '/clients': 100 };
        const state: DeepPartial<StateSchema> = { ui: { scroll } };

        expect(getUIScroll(state as StateSchema)).toEqual(scroll);
    });

    test('getUIScrollByPath returns the scroll position for a known path', () => {
        const scroll = { '/clients': 100 };
        const state: DeepPartial<StateSchema> = { ui: { scroll } };

        expect(getUIScrollByPath(state as StateSchema, '/clients')).toBe(100);
    });

    test('getUIScrollByPath defaults to 0 for an unknown path', () => {
        const state: DeepPartial<StateSchema> = { ui: { scroll: {} } };

        expect(getUIScrollByPath(state as StateSchema, '/unknown')).toBe(0);
    });
});
