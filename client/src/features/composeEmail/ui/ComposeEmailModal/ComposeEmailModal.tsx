import { FormEvent, memo, ReactNode, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { listProviders, ProviderConnection } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { announceEmailSent } from '../../model/emailSent';
import { ComposeFields, useComposeEmailForm } from '../../model/useComposeEmailForm';
import { AttachmentPicker } from '../AttachmentPicker/AttachmentPicker';
import cls from './ComposeEmailModal.module.scss';

interface ComposeEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const Field = memo(({ label, children }: { label: string; children: ReactNode }) => {
    const { t } = useTranslation();
    return <label className={cls.field}><span>{t(label)}</span>{children}</label>;
});

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

const isUsableMailbox = (provider: ProviderConnection) => provider.type === 'EMAIL' && provider.status !== 'DISABLED';

// Rendered only once the modal has been opened, so mailboxes are not requested on every page.
const ComposeEmailForm = memo(({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const connections = useResource(listProviders);
    const providers = useMemo(() => (connections.data?.data ?? []).filter(isUsableMailbox), [connections.data]);
    const onSent = useCallback(() => { announceEmailSent(); onClose(); }, [onClose]);
    const form = useComposeEmailForm({ providers, preferredProviderId: '', onSent });
    const onSubmit = (event: FormEvent) => { event.preventDefault(); void form.submit(); };
    const noMailbox = !connections.loading && providers.length === 0;
    const error = connections.error || (form.error ? t(form.error) : '');
    return <form className={cls.ComposeEmailModal} aria-label={t('New email')} noValidate onSubmit={onSubmit}>
        <h2>{t('New email')}</h2>
        {noMailbox && <p className={cls.muted}>{t('Connect a mailbox in Settings to send email.')}</p>}
        <ComposeFieldset fields={form.fields} providers={providers} onChange={form.setField} />
        <AttachmentPicker files={form.files} disabled={form.busy} onChange={form.setFiles} />
        {error && <p role="alert" className={cls.error}>{error}</p>}
        <div className={cls.actions}>
            <Button disabled={form.busy} onClick={onClose}>{t('Cancel')}</Button>
            <Button type="submit" theme={ButtonTheme.BACKGROUND_INVERTED} disabled={form.busy || providers.length === 0}>
                {t(form.busy ? 'Sending…' : 'Send')}
            </Button>
        </div>
    </form>;
});

export const ComposeEmailModal = memo(({ isOpen, onClose }: ComposeEmailModalProps) => (
    <Modal isOpen={isOpen} onClose={onClose} lazy><ComposeEmailForm onClose={onClose} /></Modal>
));
