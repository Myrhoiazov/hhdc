import { FormEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderConnection } from '@/entities/crm';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { ComposeFields, useComposeEmailForm } from '../../model/useComposeEmailForm';
import { Field, RequestState } from '../common';
import { AttachmentPicker } from './AttachmentPicker';
import cls from '../CommunicationsPage.module.scss';

interface ComposeEmailModalProps {
    isOpen: boolean;
    providers: ProviderConnection[];
    preferredProviderId: string;
    onClose: () => void;
    onSent: () => void;
}

interface ComposeFieldsetProps {
    fields: ComposeFields;
    providers: ProviderConnection[];
    onChange: (name: keyof ComposeFields, value: string) => void;
}

const ComposeFieldset = memo(({ fields, providers, onChange }: ComposeFieldsetProps) => {
    const { t } = useTranslation();
    return <>
        <Field label="Send from">
            <select value={fields.providerId} onChange={(event) => onChange('providerId', event.target.value)}>
                {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>
        </Field>
        <Field label="To">
            <input type="email" autoComplete="off" value={fields.recipient} placeholder="client@example.com"
                onChange={(event) => onChange('recipient', event.target.value)} />
        </Field>
        <Field label="Subject">
            <input value={fields.subject} maxLength={300} onChange={(event) => onChange('subject', event.target.value)} />
        </Field>
        <Field label="Message">
            <textarea rows={9} value={fields.content} placeholder={t('Write a message…')}
                onChange={(event) => onChange('content', event.target.value)} />
        </Field>
    </>;
});

export const ComposeEmailModal = memo((props: ComposeEmailModalProps) => {
    const { isOpen, providers, preferredProviderId, onClose, onSent } = props;
    const { t } = useTranslation();
    const form = useComposeEmailForm({ providers, preferredProviderId, onSent });
    const onSubmit = (event: FormEvent) => { event.preventDefault(); void form.submit(); };
    return <Modal isOpen={isOpen} onClose={onClose} lazy>
        <form className={cls.composeModal} aria-label={t('New email')} noValidate onSubmit={onSubmit}>
            <h2>{t('New email')}</h2>
            <ComposeFieldset fields={form.fields} providers={providers} onChange={form.setField} />
            <AttachmentPicker files={form.files} disabled={form.busy} onChange={form.setFiles} />
            <RequestState error={form.error ? t(form.error) : ''} loading={false} />
            <div className={cls.composeModalActions}>
                <Button disabled={form.busy} onClick={onClose}>{t('Cancel')}</Button>
                <Button type="submit" theme={ButtonTheme.BACKGROUND_INVERTED} disabled={form.busy}>
                    {t(form.busy ? 'Sending…' : 'Send')}
                </Button>
            </div>
        </form>
    </Modal>;
});
