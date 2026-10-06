import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { Transaction } from '@/entities/Transaction';
import { getTransactionFormData } from '../../selectors/getTransactionFormData';
import { mapTransactionTypeToEnum } from '../../utils/mapTransactionType';
import { mapPaymentMethodToEnum } from '../../utils/mapPaymentMethodToEnum';
import { mapExpenseCategoryToEnum } from '../../utils/mapExpenseCategoryToEnum';


export const createTransaction = createAsyncThunk<Transaction, void, ThunkConfig<string>>('transaction/addTransactionData', async (_, thunkApi) => {
    const { extra, rejectWithValue, getState } = thunkApi;

    const transactionData = getTransactionFormData(getState());

    if (!transactionData) {
        return rejectWithValue('error');
    }

    const payload = {
        ...transactionData,
        type: mapTransactionTypeToEnum(transactionData?.type),
        paymentMethod: mapPaymentMethodToEnum(transactionData?.paymentMethod),
        category: mapExpenseCategoryToEnum(transactionData?.category),
    };

    try {
        const response = await extra.apiPrivate.post<Transaction>('/transactions', payload);

        if (!response.data) {
            throw new Error();
        }

        return response.data;
    } catch (e) {
        console.log(e);
        return rejectWithValue('error');
    }
});
