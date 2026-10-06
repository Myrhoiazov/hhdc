import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { Client } from '@/entities/Client';
import { getAddClientForm } from '../../selectors/getAddClientForm/getAddClientForm';

interface ThunkArg {
    file?: File | null;
    mollieCustomerId?: string;
    payerRelation?: string;
    groupIds?: number[];
}

const buildFormData = (clientForm: Client, { file, mollieCustomerId, payerRelation, groupIds = [] }: ThunkArg): FormData => {
    const formData = new FormData();

    const payload: Client = {
        firstName: clientForm.firstName,
        lastName: clientForm.lastName,
        birthday: clientForm.birthday,
        phoneNumber: clientForm.phoneNumber,
        email: clientForm.email,
        social: clientForm.social,
        branchId: clientForm.branchId,
        preferredLanguage: clientForm.preferredLanguage,
    };

    Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, String(value));
        }
    });

    if (file) {
        formData.append('image', file);
    }

    if (mollieCustomerId) {
        formData.append('mollieCustomerId', mollieCustomerId);
        formData.append('payerRelation', payerRelation || 'unknown');
    }
    formData.append('groupIds', JSON.stringify(groupIds));

    return formData;
};

export const addClientData = createAsyncThunk<Client, ThunkArg, ThunkConfig<string>>('client/addClientData', async ({
    file,
    mollieCustomerId,
    payerRelation,
    groupIds = [],
}, thunkApi) => {
    const { extra, rejectWithValue, getState } = thunkApi;

    const clientForm = getAddClientForm(getState());

    if (!clientForm) {
        return rejectWithValue('Форма клиента не заполнена');
    }

    const formData = buildFormData(clientForm, { file, mollieCustomerId, payerRelation, groupIds });

    try {
        const response = await extra.apiPrivate.post<Client>('/clients', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.data) {
            throw new Error();
        }

        return response.data;
    } catch (e) {
        console.log(e);
        return rejectWithValue('error');
    }
});
