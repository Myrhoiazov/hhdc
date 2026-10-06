import { configureStore, Reducer, ReducersMapObject } from '@reduxjs/toolkit';
import { userReducer } from '@/entities/User';
import { StateSchema, ReduxStoreWithManager } from './StateSchema';
import { createReducerManager } from './reducerManager';
import { $api, $apiPrivate, injectStore } from '@/shared/api/api';
import { uiReducer } from '@/features/UI';

export function createReduxStore(
    initialState?: StateSchema,
    asyncReducers?: ReducersMapObject<StateSchema>,
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
        middleware: getDefaultMiddleware => getDefaultMiddleware({
            thunk: {
                extraArgument: {
                    api: $api,
                    apiPrivate: $apiPrivate,
                }
            }
        })
    });

    (store as ReduxStoreWithManager).reducerManager = reducerManager;
    injectStore(store);

    return store;
}

export type AppDispatch = ReturnType<typeof createReduxStore>['dispatch'];
export type StoreType = ReturnType<typeof createReduxStore>;