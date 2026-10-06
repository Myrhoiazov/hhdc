import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserFormSchema } from '../types/addUserFormSchema';
import { IProfile } from '@/entities/Profile';

const initialState: UserFormSchema = {
    readonly: true,
    isLoading: false,
    error: undefined,
    data: undefined,
};

const newUserSlice = createSlice({
    name: 'newUser',
    initialState,
    reducers: {
        setReadonly: (state, action: PayloadAction<boolean>) => {
            state.readonly = action.payload;
        },
        cancelEdit: (state) => {
            state.readonly = true;
            state.validateErrors = undefined;
        },
        cleanForm: (state) => {
            state.readonly = true;
            state.validateErrors = undefined;
            state.data = undefined;
        },
        updateUserForm: (state, action: PayloadAction<IProfile>) => {
            state.data = {
                ...state.data,
                ...action.payload,
            };
        },
    },
});

export const { actions: newUserActions } = newUserSlice;
export const { reducer: newUserReducer } = newUserSlice;