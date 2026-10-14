import { configureStore, Reducer, ReducersMapObject } from '@reduxjs/toolkit';
import { userActions, userReducer } from '@/entities/User';
import { StateSchema, ReduxStoreWithManager } from './StateSchema';
import { createReducerManager } from './reducerManager';
import { $api, $apiPrivate, setUnauthorizedHandler } from '@/shared/api/api';
import { uiReducer } from '@/features/UI';

export function createReduxStore(
    initialState?: StateSchema,
    asyncReducers?: ReducersMapObject<StateSchema>
) {
    const rootReducers: ReducersMapObject<StateSchema> = {
        ...asyncReducers,
        user: userReducer,
        ui: uiReducer,
    };

    const reducerManager = createReducerManager(rootReducers);

    const store = configureStore({
        reducer: reducerManager.reduce as Reducer<CombinedState<StateSchema>>,
        devTools: __IS_DEV__,
        preloadedState: initialState,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                thunk: {
                    extraArgument: {
                        api: $api,
                        apiPrivate: $apiPrivate,
                    },
                },
            }),
    });

    (store as ReduxStoreWithManager).reducerManager = reducerManager;
    // The server no longer knows the session: the user is signed out here as well.
    setUnauthorizedHandler(() => store.dispatch(userActions.logout()));

    return store;
}
