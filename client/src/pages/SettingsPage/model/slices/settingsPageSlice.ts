import {
    createSlice,
    PayloadAction,
} from '@reduxjs/toolkit';

import { SettingsPageSchema } from '../types/settingsPageSchema';
import { fetchUsersList } from '../services/fetchUsersList/fetchUsersList';
import { IProfile } from '@/entities/Profile';


const initialState: SettingsPageSchema = {
    isLoading: false,
    error: undefined,
    users: [],
    _inited: false,
};

const settingsPageSlice = createSlice({
    name: 'settingsPageSlice',
    initialState,
    reducers: {
        initState: (state) => {
            state._inited = true;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUsersList.pending, (state) => {
                state.error = undefined;
                state.isLoading = true;
            })
            .addCase(fetchUsersList.fulfilled, (
                state,
                action: PayloadAction<IProfile[]>,
            ) => {
                state.isLoading = false;
                state.users = action.payload;

            })
            .addCase(fetchUsersList.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { reducer: settingsPageReducer, actions: settingsPageActions } = settingsPageSlice;
