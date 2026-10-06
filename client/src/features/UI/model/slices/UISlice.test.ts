import { uiActions, uiReducer } from './UISlice';

describe('uiSlice', () => {
    test('returns the initial state', () => {
        const state = uiReducer(undefined, { type: '@@INIT' });
        expect(state).toEqual({ scroll: {} });
    });

    test('setScrollPosition stores the position for the given path', () => {
        const state = uiReducer(
            { scroll: {} },
            uiActions.setScrollPosition({ path: '/clients', position: 250 }),
        );

        expect(state.scroll['/clients']).toBe(250);
    });

    test('setScrollPosition overwrites an existing position for the same path', () => {
        const state = uiReducer(
            { scroll: { '/clients': 100 } },
            uiActions.setScrollPosition({ path: '/clients', position: 250 }),
        );

        expect(state.scroll['/clients']).toBe(250);
    });
});
