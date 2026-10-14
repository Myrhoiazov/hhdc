import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChoreographerHistoryItem } from '@/entities/Choreographer';
import {
    DOCUMENT_TYPES,
    DocumentKind,
    MAX_DOCUMENT_BYTES,
    uploadChoreographerDocument,
} from '@/entities/Document';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import type { ActionRun as Run } from '@/shared/lib/useResource/useAction';

const InvoiceFields = memo(() => (
    <>
        <Field label="Invoice number">
            <input name="invoiceNumber" maxLength={100} />
        </Field>
        <Field label="Issuer">
            <input name="issuerName" maxLength={200} />
        </Field>
        <Field label="Amount">
            <input name="amount" inputMode="decimal" />
        </Field>
        <Field label="Currency">
            <input name="currency" maxLength={3} defaultValue="EUR" />
        </Field>
    </>
));

const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim() || undefined;

export const UploadForm = memo(
    ({
        personId,
        assignments,
        run,
    }: {
        personId: string;
        assignments: ChoreographerHistoryItem[];
        run: Run;
    }) => {
        const { t } = useTranslation();
        const [type, setType] = useState<DocumentKind>('CONTRACT');
        const [error, setError] = useState('');
        const submit = (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const element = event.currentTarget;
            const form = new FormData(element);
            const file = element.querySelector<HTMLInputElement>('input[type="file"]')?.files?.[0];
            if (!file) {
                setError(t('Choose a file'));
                return;
            }
            if (file.size > MAX_DOCUMENT_BYTES) {
                setError(t('A document cannot be larger than 20 MB'));
                return;
            }
            setError('');
            void run(() =>
                uploadChoreographerDocument(personId, file, {
                    type,
                    title: text(form, 'title') ?? file.name,
                    assignmentId: text(form, 'assignmentId'),
                    invoiceNumber: text(form, 'invoiceNumber'),
                    issuerName: text(form, 'issuerName'),
                    amount: text(form, 'amount'),
                    currency: text(form, 'currency'),
                })
            ).then((saved) => {
                if (saved) element.reset();
            });
        };
        return (
            <Panel as="form" onSubmit={submit} aria-label={t('Upload document')}>
                <h2>{t('Upload document')}</h2>
                <div className={cls.grid}>
                    <Field label="File">
                        <input
                            name="file"
                            type="file"
                            required
                            accept=".pdf,.docx,.jpg,.jpeg,.png,.webp"
                        />
                    </Field>
                    <Field label="Document type">
                        <select
                            value={type}
                            onChange={(event) => setType(event.target.value as DocumentKind)}
                        >
                            {DOCUMENT_TYPES.map((item) => (
                                <option key={item} value={item}>
                                    {t(`DOCTYPE_${item}`)}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Title">
                        <input name="title" maxLength={300} />
                    </Field>
                    <Field label="Event">
                        <select name="assignmentId" defaultValue="">
                            <option value="">{t('Not linked to an event')}</option>
                            {assignments.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.event.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    {type === 'INVOICE' && <InvoiceFields />}
                </div>
                <p className={cls.muted}>{t('PDF, DOCX, JPEG, PNG or WebP, up to 20 MB.')}</p>
                {error && (
                    <p role="alert" className={cls.error}>
                        {error}
                    </p>
                )}
                <div className={cls.actions}>
                    <Button type="submit">{t('Upload document')}</Button>
                </div>
            </Panel>
        );
    }
);
