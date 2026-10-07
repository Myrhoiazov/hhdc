import { FormEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { createProvider, ProviderConnection, ProviderInput, updateProvider } from '@/entities/crm';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import { buildProviderInput, ProviderField, ProviderForm as ProviderFormDefinition } from '../model/providerForms';
import { Field, RequestState } from './common';
import cls from './CrmPage.module.scss';

interface ProviderFormProps {
    definition: ProviderFormDefinition;
    provider?: ProviderConnection;
    onSaved: () => void;
    onCancel?: () => void;
}

const FieldInput = memo(({ field, saved, editing }: { field: ProviderField; saved?: string | number | boolean; editing: boolean }) => {
    const initial = saved ?? field.defaultValue;
    if (field.input === 'checkbox') {
        return <label className={cls.check}><input name={field.name} type="checkbox" defaultChecked={Boolean(initial)} /><FieldLabel label={field.label} /></label>;
    }
    // Saved secrets are never returned by the API: when editing they stay blank and optional.
    const secret = field.target === 'credentials';
    return <Field label={field.label}>
        <input
            name={field.name}
            type={field.input}
            defaultValue={secret || initial === undefined ? '' : String(initial)}
            required={Boolean(field.required) && !(editing && secret)}
            autoComplete={field.input === 'password' ? 'new-password' : 'off'}
        />
    </Field>;
});

const FieldLabel = memo(({ label }: { label: string }) => {
    const { t } = useTranslation();
    return <span>{t(label)}</span>;
});

const saveProvider = async (definition: ProviderFormDefinition, values: Record<string, FormDataEntryValue>, provider?: ProviderConnection) => {
    const input = buildProviderInput(definition, values, Boolean(provider));
    return provider ? updateProvider(provider.id, input) : createProvider(input as ProviderInput);
};

export const ProviderForm = memo(({ definition, provider, onSaved, onCancel }: ProviderFormProps) => {
    const { t } = useTranslation();
    const action = useAction(onSaved);
    const editing = Boolean(provider);
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const values = Object.fromEntries(new FormData(form).entries());
        void action.run(() => saveProvider(definition, values, provider)).then((saved) => { if (saved && !editing) form.reset(); });
    };
    return <form className={cls.grid} onSubmit={submit} aria-label={t(definition.label)}>
        <Field label="Name"><input name="name" defaultValue={provider?.name ?? ''} required maxLength={200} /></Field>
        {definition.fields.map((field) => <FieldInput key={field.name} field={field} saved={provider?.settings[field.name]} editing={editing} />)}
        {definition.hint && <p className={classNames(cls.muted, {}, [cls.wide])}>{t(definition.hint)}</p>}
        {editing && <p className={classNames(cls.muted, {}, [cls.wide])}>{t('Leave the credential fields blank to keep the saved credentials.')}</p>}
        <div className={classNames(cls.actions, {}, [cls.wide])}>
            <Button type="submit" disabled={action.busy}>{t(action.busy ? 'Checking connection…' : editing ? 'Save' : 'Connect')}</Button>
            {onCancel && <Button type="button" disabled={action.busy} onClick={onCancel}>{t('Cancel')}</Button>}
        </div>
        <div className={cls.wide}><RequestState error={action.error} loading={false} /></div>
    </form>;
});
