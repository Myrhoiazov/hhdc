import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { DynamicModuleLoader, ReducersList } from './DynamicModuleLoader';

const dummyReducer = (state = { value: 1 }) => state;
const reducers: ReducersList = { profile: dummyReducer };

function setup(removeAfterUnmount?: boolean) {
    const store = createReduxStore() as ReduxStoreWithManager;
    const utils = render(
        <Provider store={store}>
            <DynamicModuleLoader reducers={reducers} removeAfterUnmount={removeAfterUnmount}>
                <div>content</div>
            </DynamicModuleLoader>
        </Provider>,
    );
    return { store, ...utils };
}

describe('DynamicModuleLoader', () => {
    test('renders its children', () => {
        const { getByText } = setup();
        expect(getByText('content')).toBeInTheDocument();
    });

    test('mounts the given reducer into the store on mount', () => {
        const { store } = setup();
        expect(store.reducerManager.getReducerMap().profile).toBe(dummyReducer);
    });

    test('removes the reducer on unmount by default', () => {
        const { store, unmount } = setup();
        unmount();
        expect(store.reducerManager.getReducerMap().profile).toBeUndefined();
    });

    test('keeps the reducer mounted on unmount when removeAfterUnmount is false', () => {
        const { store, unmount } = setup(false);
        unmount();
        expect(store.reducerManager.getReducerMap().profile).toBe(dummyReducer);
    });
});
