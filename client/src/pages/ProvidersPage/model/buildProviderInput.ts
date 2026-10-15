import type { ProviderInput, ProviderSettings } from '@/entities/Provider';
import { FieldTarget, ProviderField, ProviderForm } from './providerForms';

type FormValues = Record<string, FormDataEntryValue | null | undefined>;

const fieldValue = (
    field: ProviderField,
    raw: FormDataEntryValue | null | undefined
): string | number | boolean | undefined => {
    if (field.input === 'checkbox') return raw === 'on';
    const text = typeof raw === 'string' ? raw.trim() : '';
    // An emptied footer is sent as empty text, otherwise the saved one could never be removed.
    if (!text) return field.input === 'textarea' && typeof raw === 'string' ? '' : undefined;
    return field.input === 'number' ? Number(text) : text;
};

const collect = (form: ProviderForm, target: FieldTarget, values: FormValues): ProviderSettings => {
    const result: ProviderSettings = {};
    form.fields
        .filter((field) => field.target === target)
        .forEach((field) => {
            const value = fieldValue(field, values[field.name]);
            if (value !== undefined) result[field.name] = value;
        });
    return result;
};

// Saved secrets are never sent back to the browser, so when editing they are either left
// untouched (all blank) or replaced as a complete set.
const credentialsFrom = (
    form: ProviderForm,
    values: FormValues,
    editing: boolean
): Record<string, string> | undefined => {
    const filled = collect(form, 'credentials', values);
    if (editing && Object.keys(filled).length === 0) return undefined;
    const required = form.fields.filter(
        (field) => field.target === 'credentials' && field.required
    );
    if (required.some((field) => filled[field.name] === undefined)) {
        throw new Error('Fill in every credential field to replace the saved credentials');
    }
    return Object.fromEntries(Object.entries(filled).map(([key, value]) => [key, String(value)]));
};

export const buildProviderInput = (
    form: ProviderForm,
    values: FormValues,
    editing = false
): Partial<ProviderInput> => {
    const input: Partial<ProviderInput> = {
        name: String(values.name ?? '').trim(),
        settings: collect(form, 'settings', values),
    };
    const credentials = credentialsFrom(form, values, editing);
    if (credentials) input.credentials = credentials;
    if (editing) return input;
    return {
        ...input,
        type: form.type,
        provider: form.provider,
        ...(form.verified ? {} : { status: 'CONNECTED' }),
    };
};
