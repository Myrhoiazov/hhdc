import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LoginSchema } from '../types/loginSchema';
import { loginByUsername, ServerError } from '../services/loginByUsername/loginByUsername';

const initialState: LoginSchema = {
    isLoading: false,
    error: undefined,
    email: '',
    password: '',
};

const loginSlice = createSlice({
    name: 'login',
    initialState,
    reducers: {
        setUseremail: (state, action: PayloadAction<string>) => {
            state.email = action.payload;
        },
        setPassword: (state, action: PayloadAction<string>) => {
            state.password = action.payload;
        },
        cleanError: (state, action: PayloadAction<void>) => {
            state.error = undefined;
        },
        // Same LoginFormError-consumable shape loginByUsername.rejected produces
        // — used to surface a ?telegramError=... redirect result (useLoginForm.ts)
        // through the exact same error UI as a failed password login.
        setError: (state, action: PayloadAction<ServerError | undefined>) => {
            state.error = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginByUsername.pending, (state) => {
                state.error = undefined;
                state.isLoading = true;
            })
            .addCase(loginByUsername.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(loginByUsername.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

// Action creators are generated for each case reducer function
export const { actions: loginActions } = loginSlice;
export const { reducer: loginReducer } = loginSlice;
