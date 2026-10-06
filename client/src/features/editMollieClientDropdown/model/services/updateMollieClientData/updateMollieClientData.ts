import { createAsyncThunk } from '@reduxjs/toolkit';
import { StateSchema, ThunkConfig } from '@/app/providers/StoreProvider';
import { MollieClient } from '@/entities/MollieClient';
import { getMollieClientForm } from '../../selectors/getMollieClientForm';

const editableCustomerFields: Array<keyof MollieClient> = [
    'mollieId',
    'email',
    'givenName',
    'familyName',
    'city',
    'country',
    'postalCode',
    'streetAndNumber',
    'consumerAccount',
    'consumerName',
    'consumerBic',
    'payerName',
    'payerRelation',
    'linkSource',
    'preferredLanguage',
];

export const updateMollieClientData = createAsyncThunk<MollieClient, void, ThunkConfig<string>>(
    'mollieClient/updateMollieClientData',
    async (_, thunkApi) => {
        const { extra, rejectWithValue, getState, dispatch } = thunkApi;

        const formData = getMollieClientForm(getState() as StateSchema);

        if (!formData?.id) {
            return rejectWithValue('Customer ID is required');
        }

        const payload = Object.fromEntries(
            editableCustomerFields
                .filter((field) => formData[field] !== undefined)
                .map((field) => [field, formData[field]]),
        );

        try {
            const { data } = await extra.apiPrivate.put<MollieClient>(`/mollie/customers/${formData.id}`, payload);
            if (!data) {
                throw new Error();
            }

            return data;
        } catch (e) {
            console.log(e);
            return rejectWithValue('error validation');
        }
    }
);
