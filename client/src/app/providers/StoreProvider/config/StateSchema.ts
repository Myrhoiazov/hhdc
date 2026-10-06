import { UserSchema } from '@/entities/User';
import { EnhancedStore, Reducer, ReducersMapObject, Action } from '@reduxjs/toolkit';
import { AxiosInstance } from 'axios';
import { LoginSchema } from '@/features/Auth/model/types/loginSchema';
import { UISchema } from '@/features/UI';

export interface StateSchema {
    user: UserSchema;
    ui: UISchema;
    loginForm?: LoginSchema;
}
export type StateSchemaKey = keyof StateSchema;
export interface ReducerManager {
    getReducerMap: () => ReducersMapObject<StateSchema>;
    reduce: (state: StateSchema, action: Action) => CombinedState<StateSchema>;
    add: (key: StateSchemaKey, reducer: Reducer) => void;
    remove: (key: StateSchemaKey) => void;
}
export interface ReduxStoreWithManager extends EnhancedStore<StateSchema> { reducerManager: ReducerManager }
export interface ThunkExtraArg { api: AxiosInstance; apiPrivate: AxiosInstance }
export interface ThunkConfig<T> { rejectValue: T; extra: ThunkExtraArg; state: StateSchema }
