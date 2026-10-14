import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteKnowledge, KnowledgeDocument } from '@/entities/Knowledge';
import { formatDate } from '@/shared/lib/format/date';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';
import { Badge } from '@/shared/ui/Badge';
import { listStyles as table } from '@/shared/ui/ListTable';

interface DeleteProps {
    document: KnowledgeDocument;
    onDeleted: () => void;
    onError: (message: string) => void;
}

const DeleteDocument = memo(({ document, onDeleted, onError }: DeleteProps) => {
    const { t } = useTranslation();
    const remove = async () => {
        await deleteKnowledge(document.id);
        onDeleted();
    };
    return (
        <ConfirmDelete
            label={t('Delete document {{title}}', { title: document.title })}
            onDelete={remove}
            onError={onError}
        />
    );
});

interface RowProps extends DeleteProps {
    onOpen: (document: KnowledgeDocument) => void;
}

const DocumentRow = memo(({ document, onOpen, onDeleted, onError }: RowProps) => {
    const { t } = useTranslation();
    return (
        <tr>
            <td>
                <button
                    type="button"
                    className={`${table.name} ${table.nameButton}`}
                    onClick={() => onOpen(document)}
                >
                    {document.title}
                </button>
            </td>
            <td>
                <Badge>{t(`Knowledge scope: ${document.scope}`)}</Badge>
            </td>
            <td>
                <StatusBadge status={document.status} />
            </td>
            <td className={`${table.secondary} ${table.optional}`}>
                {document.sourceType
                    ? t(`Knowledge source: ${document.sourceType}`, {
                          defaultValue: document.sourceType,
                      })
                    : '—'}
            </td>
            <td className={`${table.secondary} ${table.optional}`}>
                {document.updatedAt ? formatDate(document.updatedAt) : '—'}
            </td>
            <td>
                <DeleteDocument document={document} onDeleted={onDeleted} onError={onError} />
            </td>
        </tr>
    );
});

interface TableProps {
    documents: KnowledgeDocument[];
    onOpen: (document: KnowledgeDocument) => void;
    onDeleted: () => void;
    onError: (message: string) => void;
}

export const DocumentsTable = memo(({ documents, onOpen, onDeleted, onError }: TableProps) => {
    const { t } = useTranslation();
    return (
        <div className={table.tableScroll}>
            <table className={table.table}>
                <thead>
                    <tr>
                        <th>{t('Title')}</th>
                        <th>{t('Scope')}</th>
                        <th>{t('Status')}</th>
                        <th className={table.optional}>{t('Source')}</th>
                        <th className={table.optional}>{t('Updated')}</th>
                        <th aria-label={t('Actions')} />
                    </tr>
                </thead>
                <tbody>
                    {documents.map((document) => (
                        <DocumentRow
                            key={document.id}
                            document={document}
                            onOpen={onOpen}
                            onDeleted={onDeleted}
                            onError={onError}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
});
