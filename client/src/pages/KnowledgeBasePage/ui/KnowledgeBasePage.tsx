import { useTranslation } from 'react-i18next';
import { ChangeEvent } from 'react';
import { Page } from '@/widgets/Page/Page';
import { useKnowledgeBase } from '../useKnowledgeBase';
import { useEmailSimulation } from '../useEmailSimulation';
import { usePromptLibrary } from '../usePromptLibrary';
import { useAiProviderSettings } from '../useAiProviderSettings';
import { AiProviderSettingsPanel } from './AiProviderSettingsPanel';
import { CATEGORY_LABELS, KNOWLEDGE_CATEGORIES, KnowledgeDocument, KnowledgeUploadForm, STATUS_LABELS } from '../knowledgeBaseTypes';
import { EmailSimulationPanel } from './EmailSimulationPanel';
import { PromptLibraryPanel } from './PromptLibraryPanel';
import { SimulationHistoryPanel } from './SimulationHistoryPanel';
import { useSimulationHistory } from '../useSimulationHistory';
import s from './KnowledgeBasePage.module.scss';

const IngestForm = ({ uploadForm, setUploadForm, crawlUrl, setCrawlUrl, busy, uploadFile, crawl }: {
    uploadForm: KnowledgeUploadForm;
    setUploadForm: (form: KnowledgeUploadForm) => void;
    crawlUrl: string;
    setCrawlUrl: (value: string) => void;
    busy: boolean;
    uploadFile: (event: ChangeEvent<HTMLInputElement>) => void;
    crawl: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <section className={s.card}>
            <h2>{t('Добавить материал')}</h2>
            <div className={s.grid}>
                <label>{t('Категория')}
                    <select value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as KnowledgeUploadForm['category'] })}>
                        {KNOWLEDGE_CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}
                    </select>
                </label>
                <label>{t('Приоритет')}
                    <input type="number" min={0} max={100} value={uploadForm.priority} onChange={(e) => setUploadForm({ ...uploadForm, priority: Number(e.target.value) })} />
                </label>
                <label>{t('Теги (через запятую)')}
                    <input placeholder="цены, взрослые" value={uploadForm.tags} onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })} />
                </label>
            </div>
            <div className={s.grid}>
                <label>{t('Файл (.pdf, .docx, .txt, .md, .html)')}
                    <input type="file" accept=".pdf,.docx,.txt,.md,.html,.htm" disabled={busy} onChange={uploadFile} />
                </label>
                <label>{t('Или ссылка на страницу')}
                    <input placeholder="https://..." value={crawlUrl} onChange={(e) => setCrawlUrl(e.target.value)} />
                </label>
                <button className={s.primary} disabled={busy || !crawlUrl.trim()} onClick={crawl}>{t('Собрать по ссылке')}</button>
            </div>
        </section>
    );
};

const StatusBadge = ({ status }: { status: KnowledgeDocument['status'] }) => {
    const { t } = useTranslation();
    return <span className={`${s.badge} ${s[`status_${status}`]}`}>{t(STATUS_LABELS[status])}</span>;
};

const KNOWLEDGE_PAGE_SIZE = 20;

const DocumentsPagination = ({ page, totalPages, total, loading, onPageChange }: {
    page: number;
    totalPages: number;
    total: number;
    loading: boolean;
    onPageChange: (page: number) => void;
}) => {
    const { t } = useTranslation();
    if (total <= 0) return null;
    const firstItemNumber = (page - 1) * KNOWLEDGE_PAGE_SIZE + 1;
    const lastItemNumber = Math.min(page * KNOWLEDGE_PAGE_SIZE, total);
    return (
        <div className={s.pagination}>
            <span>{firstItemNumber}–{lastItemNumber}{t(' из ')}{total}</span>
            <div className={s.paginationActions}>
                <button
                    className={s.pageButton}
                    disabled={loading || page <= 1}
                    onClick={() => onPageChange(Math.max(page - 1, 1))}
                    aria-label="Предыдущая страница"
                >←</button>
                <span>{page} / {totalPages}</span>
                <button
                    className={s.pageButton}
                    disabled={loading || page >= totalPages}
                    onClick={() => onPageChange(Math.min(page + 1, totalPages))}
                    aria-label="Следующая страница"
                >→</button>
            </div>
        </div>
    );
};

const DocumentRow = ({ doc, embeddingId, embed, remove }: {
    doc: KnowledgeDocument;
    embeddingId: string | null;
    embed: (id: string) => void;
    remove: (id: string) => void;
}) => {
    const { t } = useTranslation();
    return (
        <tr>
            <td className={s.title} title={doc.sourceUrl}>{doc.title || doc.sourceUrl}</td>
            <td>{CATEGORY_LABELS[doc.category]}</td>
            <td><StatusBadge status={doc.status} /></td>
            <td>{doc.priority}</td>
            <td>{doc.tags.join(', ')}</td>
            <td>{doc.chunkCount}</td>
            <td className={s.actions}>
                {doc.status === 'PENDING' && (
                    <button disabled={embeddingId === doc.id} onClick={() => embed(doc.id)}>{t('Запустить эмбеддинг')}</button>
                )}
                <button className={s.danger} onClick={() => remove(doc.id)}>{t('Удалить')}</button>
            </td>
        </tr>
    );
};

const DocumentsTable = ({ documents, page, setPage, total, totalPages, pendingTotal, loading, embeddingId, embeddingAll, embed, embedAllPending, remove }: {
    documents: KnowledgeDocument[];
    page: number;
    setPage: (page: number) => void;
    total: number;
    totalPages: number;
    pendingTotal: number;
    loading: boolean;
    embeddingId: string | null;
    embeddingAll: boolean;
    embed: (id: string) => void;
    embedAllPending: () => void;
    remove: (id: string) => void;
}) => {
    const { t } = useTranslation();
    return (
        <section className={s.card}>
            <div className={s.header}>
                <h2>{t('Материалы базы знаний')}</h2>
                {pendingTotal > 0 && (
                    <button className={s.primary} disabled={embeddingAll} onClick={embedAllPending}>
                        {t('Запустить эмбеддинг для всех ожидающих')} ({pendingTotal})
                    </button>
                )}
            </div>
            <div className={s.tableWrap}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th>{t('Название')}</th>
                            <th>{t('Категория')}</th>
                            <th>{t('Статус')}</th>
                            <th>{t('Приоритет')}</th>
                            <th>{t('Теги')}</th>
                            <th>{t('Чанков')}</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {documents.map((doc) => (
                            <DocumentRow key={doc.id} doc={doc} embeddingId={embeddingId} embed={embed} remove={remove} />
                        ))}
                        {!documents.length && <tr><td colSpan={7} className={s.empty}>{t('Материалов пока нет')}</td></tr>}
                    </tbody>
                </table>
            </div>
            <DocumentsPagination page={page} totalPages={totalPages} total={total} loading={loading} onPageChange={setPage} />
        </section>
    );
};

const KnowledgeBasePage = () => {
    const { t } = useTranslation();
    const {
        documents, page, setPage, total, totalPages, pendingTotal, loading,
        uploadForm, setUploadForm, crawlUrl, setCrawlUrl, busy, uploadFile, crawl,
        embeddingId, embeddingAll, embed, embedAllPending, remove,
    } = useKnowledgeBase();
    const simulationHistory = useSimulationHistory();
    const { form: simulationForm, setForm: setSimulationForm, running: simulationRunning, result: simulationResult, run: runSimulation } = useEmailSimulation(simulationHistory.refresh);
    const {
        prompts, form: promptForm, setForm: setPromptForm, editingId: promptEditingId, saving: promptSaving,
        startEdit: startEditPrompt, resetForm: resetPromptForm, save: savePrompt, activate: activatePrompt, remove: removePrompt,
    } = usePromptLibrary();
    const aiProvider = useAiProviderSettings();

    return (
        <Page>
            <div className={s.pageHeader}>
                <h1>{t('База знаний')}</h1>
                <p>{t('Материалы для AI-ассистента: загрузка файлов, сбор страниц по ссылке, категории и метаданные для эмбеддинга.')}</p>
            </div>
            <IngestForm uploadForm={uploadForm} setUploadForm={setUploadForm} crawlUrl={crawlUrl} setCrawlUrl={setCrawlUrl} busy={busy} uploadFile={uploadFile} crawl={crawl} />
            <DocumentsTable
                documents={documents} page={page} setPage={setPage} total={total} totalPages={totalPages}
                pendingTotal={pendingTotal} loading={loading}
                embeddingId={embeddingId} embeddingAll={embeddingAll} embed={embed} embedAllPending={embedAllPending} remove={remove}
            />
            <AiProviderSettingsPanel {...aiProvider} />
            <PromptLibraryPanel
                prompts={prompts} form={promptForm} setForm={setPromptForm} editingId={promptEditingId} saving={promptSaving}
                startEdit={startEditPrompt} resetForm={resetPromptForm} save={savePrompt} activate={activatePrompt} remove={removePrompt}
            />
            <EmailSimulationPanel form={simulationForm} setForm={setSimulationForm} running={simulationRunning} result={simulationResult} run={runSimulation} prompts={prompts} />
            <SimulationHistoryPanel {...simulationHistory} />
        </Page>
    );
};

export default KnowledgeBasePage;
