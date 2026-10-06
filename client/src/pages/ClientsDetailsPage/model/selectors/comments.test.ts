import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { getClientCommentsError, getClientCommentsIsLoading } from './comments';

describe('clientDetailsComments selectors', () => {
    test('return the stored values', () => {
        const state: StateSchema = fromPartial({
            clientDetailsComments: { isLoading: true, error: 'error' },
        });

        expect(getClientCommentsIsLoading(state)).toBe(true);
        expect(getClientCommentsError(state)).toBe('error');
    });

    test('return undefined when the slice is not mounted', () => {
        const state = {} as StateSchema;

        expect(getClientCommentsIsLoading(state)).toBeUndefined();
        expect(getClientCommentsError(state)).toBeUndefined();
    });
});
