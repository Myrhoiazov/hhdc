import { ChangeEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    CONTRACT_STATUSES,
    FileDocument,
    INVOICE_STATUSES,
    updateDocumentMetadata,
    uploadDocumentVersion,
    openDocumentFile,
} from '@/entities/Document';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from '../Choreographers.module.scss';
import type { ActionRun as Run } from '@/shared/lib/useResource/useAction';

// Opens the file in a new tab from memory; the browser shows PDFs and images and saves the rest.
const documentDetail = (document: FileDocument): string =>
    [
        document.event?.name,
        document.invoice?.invoiceNumber ? `№ ${document.invoice.invoiceNumber}` : '',
        document.invoice?.issuerName,
        document.invoice?.amount
            ? `${document.invoice.amount} ${document.invoice.currency ?? ''}`.trim()
            : '',
        `v${document.currentVersion}`,
    ]
        .filter(Boolean)
        .join(' · ');

const StatusControl = memo(
    ({ document, canManage, run }: { document: FileDocument; canManage: boolean; run: Run }) => {
        const { t } = useTranslation();
        const status = document.contract?.status ?? document.invoice?.status;
        if (!status) return null;
        if (!canManage) return <StatusBadge status={status} />;
        const options = document.contract ? CONTRACT_STATUSES : INVOICE_STATUSES;
        const field = document.contract ? 'contractStatus' : 'invoiceStatus';
        return (
            <label className={own.inlineSelect}>
                <span className={own.hiddenInput}>{`${t('Status')}: ${document.title}`}</span>
                <select
                    value={status}
                    onChange={(event) =>
                        void run(() =>
                            updateDocumentMetadata(document.id, { [field]: event.target.value })
                        )
                    }
                >
                    {options.map((option) => (
                        <option key={option} value={option}>
                            {t(`DOC_${option}`)}
                        </option>
                    ))}
                </select>
            </label>
        );
    }
);

// "Paid" is shown from confirmed payments; a label set by hand is called what it is.
const PaymentEvidenceChip = memo(({ document }: { document: FileDocument }) => {
    const { t } = useTranslation();
    if (!document.paymentEvidence) return null;
    return <span className={own.chip}>{t(`EVIDENCE_${document.paymentEvidence}`)}</span>;
});

export const DocumentRow = memo(
    ({ document, canManage, run }: { document: FileDocument; canManage: boolean; run: Run }) => {
        const { t } = useTranslation();
        const replace = (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void run(() => uploadDocumentVersion(document.id, file));
        };
        return (
            <article className={own.assignment} aria-label={document.title}>
                <div className={own.headerTop}>
                    <div>
                        <strong>{document.title}</strong>
                        <div
                            className={own.secondary}
                        >{`${t(`DOCTYPE_${document.type}`)} · ${documentDetail(document)}`}</div>
                    </div>
                    <span className={own.chips}>
                        <PaymentEvidenceChip document={document} />
                        <StatusControl document={document} canManage={canManage} run={run} />
                    </span>
                </div>
                {document.duplicateOfDocumentId && (
                    <p role="alert" className={cls.error}>
                        {t('Another invoice has the same issuer and number.')}
                    </p>
                )}
                <div className={cls.actions}>
                    <Button
                        aria-label={`${t('Open')}: ${document.title}`}
                        onClick={() => void run(() => openDocumentFile(document.id))}
                    >
                        {t('Open')}
                    </Button>
                    {document.versions
                        .filter((item) => item.version !== document.currentVersion)
                        .map((item) => (
                            <Button
                                key={item.version}
                                aria-label={`${document.title}: v${item.version}`}
                                onClick={() =>
                                    void run(() => openDocumentFile(document.id, item.version))
                                }
                            >{`v${item.version}`}</Button>
                        ))}
                    {canManage && (
                        <label className={own.fileButton}>
                            <input
                                className={own.hiddenInput}
                                type="file"
                                aria-label={`${t('Upload new version')}: ${document.title}`}
                                onChange={replace}
                            />
                            {t('Upload new version')}
                        </label>
                    )}
                    {canManage && (
                        <Button
                            aria-label={`${t('Archive')}: ${document.title}`}
                            onClick={() =>
                                void run(() =>
                                    updateDocumentMetadata(document.id, { archived: true })
                                )
                            }
                        >
                            {t('Archive')}
                        </Button>
                    )}
                </div>
            </article>
        );
    }
);
