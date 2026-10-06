import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { Mandate } from '@/entities/Mandate';
import { getMollieMandateData } from '../../selectors/getMollieMandateCard';
import { fetchMollieClientsList } from '../fetchMollieClientsList/fetchMollieClientsList';


export const addMandate = createAsyncThunk<Mandate, void, ThunkConfig<string>>(
    'mollie/addMandate',
    async (_, thunkAPI) => {
        const { extra, rejectWithValue, getState, dispatch } = thunkAPI;

        const mandateForm = getMollieMandateData(getState());

        if (!mandateForm) {
            return rejectWithValue('Форма записи не заполнена');
        }


        try {
            const { data } = await extra.apiPrivate.post<Mandate>('/mollie/mandates', mandateForm);

            if (!data) {
                throw new Error();
            }

            dispatch(fetchMollieClientsList({}))

            return data;
        } catch (e) {
            console.log(e);
            return rejectWithValue('error');
        }
    });
