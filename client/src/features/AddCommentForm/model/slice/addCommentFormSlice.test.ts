import { addCommentFormActions, addCommentFormReducer } from './addCommentFormSlice';

describe('addCommentFormSlice', () => {
    test('returns the initial state', () => {
        const state = addCommentFormReducer(undefined, { type: '@@INIT' });
        expect(state).toEqual({ text: '' });
    });

    test('setText updates the text', () => {
        const state = addCommentFormReducer({ text: '' }, addCommentFormActions.setText('hello'));
        expect(state.text).toBe('hello');
    });
});
