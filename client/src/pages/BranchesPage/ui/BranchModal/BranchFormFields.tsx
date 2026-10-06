import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import s from './BranchModal.module.scss';

interface BranchFormFieldsProps {
    form: { name: string; city: string; address: string; phone: string; email: string; description: string; isActive: boolean };
    updateField: <Key extends keyof BranchFormFieldsProps['form']>(key: Key, value: BranchFormFieldsProps['form'][Key]) => void;
}

export const BranchFormFields = memo(({ form, updateField }: BranchFormFieldsProps) => {
    const { t } = useTranslation();
    const updateText = (key: Exclude<keyof typeof form, 'isActive'>) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateField(key, event.target.value);

    return (
        <div className={s.form}>
            <div className={s.field}>
                <label className={s.label}>{t('Название')} <span className={s.req}>*</span></label>
                <input className={s.input} placeholder="DDC Центральный" value={form.name} onChange={updateText('name')} />
            </div>
            <div className={s.row}>
                <Field label={t('Город')} placeholder="Киев" value={form.city} onChange={updateText('city')} />
                <Field label={t('Адрес')} placeholder="ул. Хрещатик, 1" value={form.address} onChange={updateText('address')} />
            </div>
            <div className={s.row}>
                <Field label={t('Телефон')} placeholder="+38 (050) 000-00-00" value={form.phone} onChange={updateText('phone')} />
                <Field label={t('Email')} placeholder="branch@ddc.com" value={form.email} onChange={updateText('email')} />
            </div>
            <div className={s.field}>
                <label className={s.label}>{t('Описание')}</label>
                <textarea className={s.textarea} placeholder="Основной филиал в центре города..." value={form.description} onChange={updateText('description')} rows={3} />
            </div>
            <label className={s.checkboxLabel}>
                <input type="checkbox" checked={form.isActive} onChange={(event) => updateField('isActive', event.target.checked)} className={s.checkbox} />
                {t('Филиал активен')}
            </label>
        </div>
    );
});

interface FieldProps { label: string; placeholder: string; value: string; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void; }

const Field = ({ label, placeholder, value, onChange }: FieldProps) => (
    <div className={s.field}>
        <label className={s.label}>{label}</label>
        <input className={s.input} placeholder={placeholder} value={value} onChange={onChange} />
    </div>
);
