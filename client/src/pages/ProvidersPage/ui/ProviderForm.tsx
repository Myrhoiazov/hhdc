import { FormEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    createProvider,
    ProviderConnection,
    ProviderInput,
    updateProvider,
} from '@/entities/Provider';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import { buildProviderInput } from '../model/buildProviderInput';
import { ProviderForm as ProviderFormDefinition } from '../model/providerForms';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import cls from '@/shared/ui/layout/layout.module.scss';
import { FieldInput } from './ProviderFieldInput';

interface ProviderFormProps {
    definition: ProviderFormDefinition;
    provider?: ProviderConnection;
    onSaved: () => void;
    onCancel?: () => void;
}

const saveProvider = async (
    definition: ProviderFormDefinition,
    values: Record<string, FormDataEntryValue>,
    provider?: ProviderConnection
) => {
    const input = buildProviderInput(definition, values, Boolean(provider));
    return provider ? updateProvider(provider.id, input) : createProvider(input as ProviderInput);
};

export const ProviderForm = memo(
    ({ definition, provider, onSaved, onCancel }: ProviderFormProps) => {
        const { t } = useTranslation();
        const action = useAction(onSaved);
        const editing = Boolean(provider);
        const submit = (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = Object.fromEntries(new FormData(form).entries());
            void action
                .run(() => saveProvider(definition, values, provider))
                .then((saved) => {
                    if (saved && !editing) form.reset();
                });
        };
        return (
            <form className={cls.grid} onSubmit={submit} aria-label={t(definition.label)}>
                <Field label="Name">
                    <input
                        name="name"
                        defaultValue={provider?.name ?? ''}
                        required
                        maxLength={200}
                    />
                </Field>
                {definition.fields.map((field) => (
                    <FieldInput
                        key={field.name}
                        field={field}
                        saved={provider?.settings[field.name]}
                        editing={editing}
                    />
                ))}
                {definition.hint && (
                    <p className={classNames(cls.muted, {}, [cls.wide])}>{t(definition.hint)}</p>
                )}
                {editing && (
                    <p className={classNames(cls.muted, {}, [cls.wide])}>
                        {t('Leave the credential fields blank to keep the saved credentials.')}
                    </p>
                )}
                <div className={classNames(cls.actions, {}, [cls.wide])}>
                    <Button type="submit" disabled={action.busy}>
                        {t(action.busy ? 'Checking connection…' : editing ? 'Save' : 'Connect')}
                    </Button>
                    {onCancel && (
                        <Button type="button" disabled={action.busy} onClick={onCancel}>
                            {t('Cancel')}
                        </Button>
                    )}
                </div>
                <div className={cls.wide}>
                    <RequestState error={action.error} loading={false} />
                </div>
            </form>
        );
    }
);
