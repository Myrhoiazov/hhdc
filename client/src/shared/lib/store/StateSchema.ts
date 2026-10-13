import { Action, EnhancedStore, Reducer, ReducersMapObject, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { AxiosInstance } from 'axios';

// The state of the store. It is declared empty here, in the lowest layer, and every slice that owns
// a reducer adds its own field next to its types:
//     declare module '@/shared/lib/store/StateSchema' { interface StateSchema { user: UserSchema } }
// so that no layer has to import the layers above it to type a selector or a thunk.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface StateSchema {}

export type StateSchemaKey = keyof StateSchema;

export interface ReducerManager {
    getReducerMap: () => ReducersMapObject<StateSchema>;
    reduce: (state: StateSchema, action: Action) => CombinedState<StateSchema>;
    add: (key: StateSchemaKey, reducer: Reducer) => void;
    remove: (key: StateSchemaKey) => void;
}

export interface ReduxStoreWithManager extends EnhancedStore<StateSchema> {
    reducerManager: ReducerManager;
}

export interface ThunkExtraArg {
    api: AxiosInstance;
    apiPrivate: AxiosInstance;
}

export interface ThunkConfig<T> {
    rejectValue: T;
    extra: ThunkExtraArg;
    state: StateSchema;
}

export type AppDispatch = ThunkDispatch<StateSchema, ThunkExtraArg, UnknownAction>;
