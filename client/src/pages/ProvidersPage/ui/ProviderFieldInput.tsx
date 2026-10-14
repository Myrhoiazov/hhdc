import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderField } from '../model/providerForms';
import { Field } from '@/shared/ui/Field';
import cls from '@/shared/ui/layout/layout.module.scss';

export const FieldInput = memo(
    ({
        field,
        saved,
        editing,
    }: {
        field: ProviderField;
        saved?: string | number | boolean;
        editing: boolean;
    }) => {
        const initial = saved ?? field.defaultValue;
        if (field.input === 'checkbox') {
            return (
                <label className={cls.check}>
                    <input name={field.name} type="checkbox" defaultChecked={Boolean(initial)} />
                    <FieldLabel label={field.label} />
                </label>
            );
        }
        if (field.input === 'textarea') {
            return (
                <div className={cls.wide}>
                    <Field label={field.label}>
                        <textarea
                            name={field.name}
                            rows={8}
                            spellCheck={false}
                            defaultValue={initial === undefined ? '' : String(initial)}
                        />
                    </Field>
                </div>
            );
        }
        // Saved secrets are never returned by the API: when editing they stay blank and optional.
        const secret = field.target === 'credentials';
        return (
            <Field label={field.label}>
                <input
                    name={field.name}
                    type={field.input}
                    defaultValue={secret || initial === undefined ? '' : String(initial)}
                    required={Boolean(field.required) && !(editing && secret)}
                    autoComplete={field.input === 'password' ? 'new-password' : 'off'}
                />
            </Field>
        );
    }
);

const FieldLabel = memo(({ label }: { label: string }) => {
    const { t } = useTranslation();
    return <span>{t(label)}</span>;
});
