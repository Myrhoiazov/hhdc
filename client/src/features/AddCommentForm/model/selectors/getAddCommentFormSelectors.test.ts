import { StateSchema } from '@/app/providers/StoreProvider';
import { getAddCommentFormError, getAddCommentFormText } from './getAddCommentFormSelectors';

describe('getAddCommentFormSelectors', () => {
    test('getAddCommentFormText returns the text', () => {
        const state: DeepPartial<StateSchema> = { addCommentForm: { text: 'hello' } };
        expect(getAddCommentFormText(state as StateSchema)).toBe('hello');
    });

    test('getAddCommentFormText defaults to an empty string', () => {
        expect(getAddCommentFormText({} as StateSchema)).toBe('');
    });

    test('getAddCommentFormError returns the error', () => {
        const state: DeepPartial<StateSchema> = { addCommentForm: { error: 'boom' } };
        expect(getAddCommentFormError(state as StateSchema)).toBe('boom');
    });

    test('getAddCommentFormError returns undefined when the slice is missing', () => {
        expect(getAddCommentFormError({} as StateSchema)).toBeUndefined();
    });
});
