import { ChangeEvent, FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ChoreographerHistoryItem, CONTRACT_STATUSES, DOCUMENT_TYPES, DocumentKind, fetchDocumentFile, FileDocument, INVOICE_STATUSES, listChoreographerDocuments,
    listChoreographerHistory, MAX_DOCUMENT_BYTES, updateDocumentMetadata, uploadChoreographerDocument, uploadDocumentVersion,
} from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState, StatusBadge } from '../common';
import cls from '../CrmPage.module.scss';
import own from './Choreographers.module.scss';

type Run = (work: () => Promise<unknown>) => Promise<boolean>;

// Opens the file in a new tab from memory; the browser shows PDFs and images and saves the rest.
export const openDocumentFile = async (documentId: string, version?: number): Promise<void> => {
    const url = URL.createObjectURL(await fetchDocumentFile(documentId, version));
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const documentDetail = (document: FileDocument): string => [
    document.event?.name,
    document.invoice?.invoiceNumber ? `№ ${document.invoice.invoiceNumber}` : '',
    document.invoice?.issuerName,
    document.invoice?.amount ? `${document.invoice.amount} ${document.invoice.currency ?? ''}`.trim() : '',
    `v${document.currentVersion}`,
].filter(Boolean).join(' · ');

const StatusControl = memo(({ document, canManage, run }: { document: FileDocument; canManage: boolean; run: Run }) => {
    const { t } = useTranslation();
    const status = document.contract?.status ?? document.invoice?.status;
    if (!status) return null;
    if (!canManage) return <StatusBadge status={status} />;
    const options = document.contract ? CONTRACT_STATUSES : INVOICE_STATUSES;
    const field = document.contract ? 'contractStatus' : 'invoiceStatus';
    return <label className={own.inlineSelect}><span className={own.hiddenInput}>{`${t('Status')}: ${document.title}`}</span>
        <select value={status} onChange={(event) => void run(() => updateDocumentMetadata(document.id, { [field]: event.target.value }))}>
            {options.map((option) => <option key={option} value={option}>{t(`DOC_${option}`)}</option>)}
        </select></label>;
});

// "Paid" is shown from confirmed payments; a label set by hand is called what it is.
const PaymentEvidenceChip = memo(({ document }: { document: FileDocument }) => {
    const { t } = useTranslation();
    if (!document.paymentEvidence) return null;
    return <span className={own.chip}>{t(`EVIDENCE_${document.paymentEvidence}`)}</span>;
});

const DocumentRow = memo(({ document, canManage, run }: { document: FileDocument; canManage: boolean; run: Run }) => {
    const { t } = useTranslation();
    const replace = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void run(() => uploadDocumentVersion(document.id, file));
    };
    return <article className={own.assignment} aria-label={document.title}>
        <div className={own.headerTop}>
            <div><strong>{document.title}</strong><div className={own.secondary}>{`${t(`DOCTYPE_${document.type}`)} · ${documentDetail(document)}`}</div></div>
            <span className={own.chips}><PaymentEvidenceChip document={document} /><StatusControl document={document} canManage={canManage} run={run} /></span>
        </div>
        {document.duplicateOfDocumentId && <p role="alert" className={cls.error}>{t('Another invoice has the same issuer and number.')}</p>}
        <div className={cls.actions}>
            <Button aria-label={`${t('Open')}: ${document.title}`} onClick={() => void run(() => openDocumentFile(document.id))}>{t('Open')}</Button>
            {document.versions.filter((item) => item.version !== document.currentVersion).map((item) => <Button key={item.version}
                aria-label={`${document.title}: v${item.version}`} onClick={() => void run(() => openDocumentFile(document.id, item.version))}>{`v${item.version}`}</Button>)}
            {canManage && <label className={own.fileButton}>
                <input className={own.hiddenInput} type="file" aria-label={`${t('Upload new version')}: ${document.title}`} onChange={replace} />{t('Upload new version')}
            </label>}
            {canManage && <Button aria-label={`${t('Archive')}: ${document.title}`} onClick={() => void run(() => updateDocumentMetadata(document.id, { archived: true }))}>{t('Archive')}</Button>}
        </div>
    </article>;
});

const InvoiceFields = memo(() => <>
    <Field label="Invoice number"><input name="invoiceNumber" maxLength={100} /></Field>
    <Field label="Issuer"><input name="issuerName" maxLength={200} /></Field>
    <Field label="Amount"><input name="amount" inputMode="decimal" /></Field>
    <Field label="Currency"><input name="currency" maxLength={3} defaultValue="EUR" /></Field>
</>);

const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim() || undefined;

const UploadForm = memo(({ personId, assignments, run }: { personId: string; assignments: ChoreographerHistoryItem[]; run: Run }) => {
    const { t } = useTranslation();
    const [type, setType] = useState<DocumentKind>('CONTRACT');
    const [error, setError] = useState('');
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        const file = element.querySelector<HTMLInputElement>('input[type="file"]')?.files?.[0];
        if (!file) { setError(t('Choose a file')); return; }
        if (file.size > MAX_DOCUMENT_BYTES) { setError(t('A document cannot be larger than 20 MB')); return; }
        setError('');
        void run(() => uploadChoreographerDocument(personId, file, {
            type, title: text(form, 'title') ?? file.name, assignmentId: text(form, 'assignmentId'),
            invoiceNumber: text(form, 'invoiceNumber'), issuerName: text(form, 'issuerName'), amount: text(form, 'amount'), currency: text(form, 'currency'),
        })).then((saved) => { if (saved) element.reset(); });
    };
    return <form className={cls.panel} onSubmit={submit} aria-label={t('Upload document')}><h2>{t('Upload document')}</h2>
        <div className={cls.grid}>
            <Field label="File"><input name="file" type="file" required accept=".pdf,.docx,.jpg,.jpeg,.png,.webp" /></Field>
            <Field label="Document type"><select value={type} onChange={(event) => setType(event.target.value as DocumentKind)}>
                {DOCUMENT_TYPES.map((item) => <option key={item} value={item}>{t(`DOCTYPE_${item}`)}</option>)}</select></Field>
            <Field label="Title"><input name="title" maxLength={300} /></Field>
            <Field label="Event"><select name="assignmentId" defaultValue="">
                <option value="">{t('Not linked to an event')}</option>
                {assignments.map((item) => <option key={item.id} value={item.id}>{item.event.name}</option>)}</select></Field>
            {type === 'INVOICE' && <InvoiceFields />}
        </div>
        <p className={cls.muted}>{t('PDF, DOCX, JPEG, PNG or WebP, up to 20 MB.')}</p>
        {error && <p role="alert" className={cls.error}>{error}</p>}
        <div className={cls.actions}><Button type="submit">{t('Upload document')}</Button></div>
    </form>;
});

export const DocumentsTab = memo(({ personId, canManage }: { personId: string; canManage: boolean }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listChoreographerDocuments(personId), [personId]);
    const loadAssignments = useCallback(() => listChoreographerHistory(personId), [personId]);
    const documents = useResource(load);
    const assignments = useResource(loadAssignments);
    const [error, setError] = useState('');
    const run: Run = async (work) => {
        setError('');
        try { await work(); await documents.refresh(); return true; }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); return false; }
    };
    return <>
        <RequestState error={error || documents.error} loading={documents.loading && !documents.data} />
        <section className={cls.panel} aria-label={t('Documents')}><h2>{t('Documents')}</h2>
            {documents.data?.map((document) => <DocumentRow key={document.id} document={document} canManage={canManage} run={run} />)}
            {documents.data?.length === 0 && <p className={cls.muted}>{t('No documents yet.')}</p>}
        </section>
        {canManage && <UploadForm personId={personId} assignments={assignments.data ?? []} run={run} />}
    </>;
});
