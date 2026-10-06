import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';
import { StateView } from '@/shared/ui/StateView';
import { Modal } from '@/shared/ui/Modal/Modal';
import { CreateInvoiceModal } from '../CreateInvoiceModal/CreateInvoiceModal';
import { InvoiceActionModal } from '../InvoiceActionModal/InvoiceActionModal';
import { InvoiceListItem } from './InvoiceListItem';
import { InvoicesPageToolbar } from './InvoicesPageToolbar';
import { InvoicesPagePagination } from './InvoicesPagePagination';
import { useInvoicesPage } from './useInvoicesPage';
import s from './InvoicesPage.module.scss';

const PdfPreviewModal = ({
    previewUrl,
    previewNumber,
    onClose,
}: {
    previewUrl: string | null;
    previewNumber: string | null;
    onClose: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <Modal isOpen={Boolean(previewUrl)} onClose={onClose} lazy>
            <div className={s.previewModal}>
                <div>
                    <strong>{previewNumber}</strong>
                    <button onClick={onClose}>{t('Закрыть')}</button>
                </div>
                {previewUrl && <iframe title={`PDF ${previewNumber}`} src={previewUrl} />}
            </div>
        </Modal>
    );
};

const InvoicesList = ({
    invoices,
    onEdit,
    onPreviewPdf,
    onDownloadPdf,
    onSendEmail,
    onCreateMolliePaymentLink,
    onSetActiveAction,
    onUpdateStatus,
}: {
    invoices: ReturnType<typeof useInvoicesPage>['invoices'];
    onEdit: (invoice: NonNullable<ReturnType<typeof useInvoicesPage>['editInvoice']>) => void;
    onPreviewPdf: (invoice: NonNullable<ReturnType<typeof useInvoicesPage>['editInvoice']>) => void;
    onDownloadPdf: (invoice: NonNullable<ReturnType<typeof useInvoicesPage>['editInvoice']>) => void;
    onSendEmail: (invoice: NonNullable<ReturnType<typeof useInvoicesPage>['editInvoice']>) => void;
    onCreateMolliePaymentLink: (invoice: NonNullable<ReturnType<typeof useInvoicesPage>['editInvoice']>) => void;
    onSetActiveAction: (action: NonNullable<ReturnType<typeof useInvoicesPage>['activeAction']>) => void;
    onUpdateStatus: ReturnType<typeof useInvoicesPage>['updateStatus'];
}) => (
    <div className={s.list}>
        {invoices.map((invoice) => (
            <InvoiceListItem
                key={invoice.id}
                invoice={invoice}
                onEdit={onEdit}
                onPreviewPdf={onPreviewPdf}
                onDownloadPdf={onDownloadPdf}
                onSendEmail={onSendEmail}
                onCreateMolliePaymentLink={onCreateMolliePaymentLink}
                onSetActiveAction={onSetActiveAction}
                onUpdateStatus={onUpdateStatus}
            />
        ))}
    </div>
);

interface InvoicesListSectionProps {
    loading: boolean;
    invoices: ReturnType<typeof useInvoicesPage>['invoices'];
    appliedQuery: string;
    pagination: ReactNode;
    actions: Omit<Parameters<typeof InvoicesList>[0], 'invoices'>;
}

const InvoicesListSection = ({ loading, invoices, appliedQuery, pagination, actions }: InvoicesListSectionProps) => {
    if (loading) return <ListSkeleton rows={4} height={104} />;
    if (invoices.length === 0) {
        return (
            <StateView
                className={s.empty}
                title={appliedQuery ? 'По вашему запросу ничего не найдено' : 'Инвойсов пока нет'}
                text={appliedQuery
                    ? 'Попробуйте изменить имя, email, номер или транзакцию.'
                    : 'Создайте первый черновик, проверьте данные и затем выставьте инвойс.'}
            />
        );
    }
    return (
        <>
            {pagination}
            <InvoicesList invoices={invoices} {...actions} />
            {pagination}
        </>
    );
};

const InvoicesPage = memo(() => {
    const {
        invoices, loading, modalOpen, paidMode, editInvoice, status, setStatus,
        query, setQuery, appliedQuery, page, setPage, total, totalPages,
        previewUrl, previewNumber, activeAction, setActiveAction, fetchInvoices, updateStatus,
        handleActionConfirm, createMolliePaymentLink, previewPdf, downloadPdf, closePreview,
        sendEmail, closeModal, applySearch, resetSearch, openCreateModal, openEditModal,
    } = useInvoicesPage();

    const pagination = (
        <InvoicesPagePagination page={page} totalPages={totalPages} total={total} loading={loading} onPageChange={setPage} />
    );

    const actions = {
        onEdit: openEditModal,
        onPreviewPdf: previewPdf,
        onDownloadPdf: downloadPdf,
        onSendEmail: sendEmail,
        onCreateMolliePaymentLink: createMolliePaymentLink,
        onSetActiveAction: setActiveAction,
        onUpdateStatus: updateStatus,
    };

    return (
        <Page>
            <InvoicesPageToolbar
                query={query} appliedQuery={appliedQuery} status={status}
                onQueryChange={setQuery} onApplySearch={applySearch} onResetSearch={resetSearch}
                onStatusChange={(value) => { setPage(1); setStatus(value); }} onOpenCreateModal={openCreateModal}
            />

            <InvoicesListSection
                loading={loading} invoices={invoices} appliedQuery={appliedQuery}
                pagination={pagination} actions={actions}
            />

            <CreateInvoiceModal
                isOpen={modalOpen} onClose={closeModal} onSaved={fetchInvoices}
                editInvoice={editInvoice} paidMode={paidMode}
            />

            <InvoiceActionModal action={activeAction} onConfirm={handleActionConfirm} onClose={() => setActiveAction(null)} />

            <PdfPreviewModal previewUrl={previewUrl} previewNumber={previewNumber} onClose={closePreview} />
        </Page>
    );
});

export default InvoicesPage;
