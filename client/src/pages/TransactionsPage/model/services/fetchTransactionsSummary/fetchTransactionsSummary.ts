import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { Summary } from '@/entities/Summary';
import { getTransactionPageMonth, getTransactionPageType } from '../../selectors/transactionPageSelectors';
import { TransactionType } from '@/entities/TransactionType';

export const fetchTransactionsSummary = createAsyncThunk<
    Summary,
    void,
    ThunkConfig<string>
>(
    'summaryPage/fetchTransactionsSummary',
    async (_, thunkApi) => {
        const { extra, rejectWithValue, getState } = thunkApi;
        const type = getTransactionPageType(getState());
        const month = getTransactionPageMonth(getState());

        try {
            const { data } = await extra.apiPrivate.get<Summary>('/transactions/summary', {
                params: {
                    _month: month,
                    _type: type === TransactionType.ALL ? null : type
                }
            })

            if (!data) {
                throw new Error('error');
            }

            return data;
        } catch (e) {
            return rejectWithValue('error');
        }
    },
);
