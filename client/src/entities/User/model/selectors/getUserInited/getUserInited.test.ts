import { StateSchema } from '@/app/providers/StoreProvider';
import { getUserInited } from './getUserInited';

describe('getUserInited', () => {
    test('returns true once the user slice is initialized', () => {
        const state: DeepPartial<StateSchema> = { user: { _inited: true } };

        expect(getUserInited(state as StateSchema)).toBe(true);
    });

    test('returns false before initialization', () => {
        const state: DeepPartial<StateSchema> = { user: { _inited: false } };

        expect(getUserInited(state as StateSchema)).toBe(false);
    });
});
