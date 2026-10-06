import { UserSchema } from '@/entities/User';
import {
    EnhancedStore,
    Reducer,
    ReducersMapObject,
    Action,
} from '@reduxjs/toolkit';
import { ProfileSchema } from '@/entities/Profile';
import { AxiosInstance } from 'axios';
import { ArticleDetailsSchema } from '@/entities/Article';
import { ArticleDetailsCommentsSchema } from '@/pages/ArticleDetailsPage';
import { AddCommentFormSchema } from '@/features/AddCommentForm';
import { ArticlePageSchema } from '@/pages/ArticlesPage';
import { LoginSchema } from '@/features/Auth/model/types/loginSchema';
import { ClientPageSchema } from '@/pages/ClientsPage/model/types/ClientPageSchema';
import { ClientSchema } from '@/features/addClientForm';
import { ClientDetailsSchema } from '@/entities/Client';
import { ClientDetailsCommentsSchema } from '@/pages/ClientsDetailsPage';
import { UISchema } from '@/features/UI';
import { TransactionsPageSchema } from '@/pages/TransactionsPage';
import { AddTransactionFormSchema } from '@/features/addTransactionForm';
import { UserFormSchema } from '@/features/addUserForm';
import { SettingsPageSchema } from '@/pages/SettingsPage';
import { CreateMollieMandateFormSchema } from '@/features/createMollieMandateForm';
import { MollieClientsDetailsPageSchema } from '@/pages/MolliePage';
import { MollieClientFormSchema } from '@/features/editMollieClientDropdown';
import { AddMollieClientSchema } from '@/features/addMollieClientForm';
import { AddMollieSubscriptionSchema } from '@/features/addMollieSubscriptionForm';
import { MollieClientDetailsSchema } from '@/entities/MollieClient';

export interface StateSchema {
    user: UserSchema;
    ui: UISchema;

    // Асинхронные редюсеры
    loginForm?: LoginSchema;
    profile?: ProfileSchema;

    client?: ClientSchema;
    clientDetails?: ClientDetailsSchema
    clientDetailsComments?: ClientDetailsCommentsSchema;
    clientsPage?: ClientPageSchema

    newUser?: UserFormSchema;
    settingsPage?: SettingsPageSchema;

    articleDetails?: ArticleDetailsSchema;
    articleDetailsComments?: ArticleDetailsCommentsSchema;
    addCommentForm?: AddCommentFormSchema;
    articlesPage?: ArticlePageSchema;

    transactionPage?: TransactionsPageSchema
    addTransactionForm?: AddTransactionFormSchema

    createMollieMandateForm?: CreateMollieMandateFormSchema
    mollieClientsPage?: MollieClientsDetailsPageSchema
    mollieClientForm?: MollieClientFormSchema
    addMollieClientForm?: AddMollieClientSchema
    addMollieSubscriptionForm?: AddMollieSubscriptionSchema
    mollieClientDetails?: MollieClientDetailsSchema
    customerDetailsMandates?: MollieClientsDetailsPageSchema
}

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
    api: AxiosInstance,
    apiPrivate: AxiosInstance,
}

export interface ThunkConfig<T> {
    rejectValue: T
    extra: ThunkExtraArg,
    state: StateSchema;
}
