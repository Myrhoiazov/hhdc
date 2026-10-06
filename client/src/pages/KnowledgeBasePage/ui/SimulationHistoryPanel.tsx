import { useTranslation } from 'react-i18next';
import { SimulationClassification, SimulationDraft, SimulationKnowledgeChunk, SimulationMetric, SimulationProvider } from '../emailSimulationTypes';
import { SimulationRunDetail, SimulationRunSummary } from '../simulationHistoryTypes';
import s from './KnowledgeBasePage.module.scss';

const HISTORY_PAGE_SIZE = 20;

const summarizeMetrics = (metrics: SimulationRunSummary['metrics']) => ({
    totalDurationMs: metrics.reduce((sum, metric) => sum + metric.durationMs, 0),
    totalTokens: metrics.reduce((sum, metric) => sum + (metric.totalTokens ?? 0), 0),
});

const outcomeLabel = (run: SimulationRunSummary, t: (key: string) => string): string => {
    if (run.deterministicSpamReason) return t('спам');
    if (run.draftSkippedReason) return t('без черновика');
    return t('черновик создан');
};

const HistoryPagination = ({ page, totalPages, total, loading, onPageChange }: {
    page: number; totalPages: number; total: number; loading: boolean; onPageChange: (page: number) => void;
}) => {
    const { t } = useTranslation();
    if (total <= 0) return null;
    const firstItemNumber = (page - 1) * HISTORY_PAGE_SIZE + 1;
    const lastItemNumber = Math.min(page * HISTORY_PAGE_SIZE, total);
    return (
        <div className={s.pagination}>
            <span>{firstItemNumber}–{lastItemNumber}{t(' из ')}{total}</span>
            <div className={s.paginationActions}>
                <button className={s.pageButton} disabled={loading || page <= 1} onClick={() => onPageChange(Math.max(page - 1, 1))} aria-label="Предыдущая страница">←</button>
                <span>{page} / {totalPages}</span>
                <button className={s.pageButton} disabled={loading || page >= totalPages} onClick={() => onPageChange(Math.min(page + 1, totalPages))} aria-label="Следующая страница">→</button>
            </div>
        </div>
    );
};

const ClassificationSection = ({ classification }: { classification: SimulationClassification }) => {
    const { t } = useTranslation();
    return (
        <div className={s.simulationBlock}>
            <h3>{t('Классификация')}</h3>
            <div className={s.simulationFields}>
                <span>{t('spam:')} <strong>{String(classification.spam)}</strong></span>
                <span>{t('needsReply:')} <strong>{String(classification.needsReply)}</strong></span>
                <span>{t('intent:')} <strong>{classification.intent}</strong></span>
                <span>{t('confidence:')} <strong>{classification.confidence.toFixed(2)}</strong></span>
            </div>
        </div>
    );
};

const KnowledgeSection = ({ knowledge }: { knowledge: SimulationKnowledgeChunk[] }) => {
    const { t } = useTranslation();
    if (!knowledge.length) return null;
    return (
        <div className={s.simulationBlock}>
            <h3>{t('Найденные знания')}</h3>
            {knowledge.map((chunk) => (
                <div key={chunk.id} className={s.knowledgeChunk}>
                    <div className={s.knowledgeChunkHeader}>
                        <span>{t('score=')}{chunk.score.toFixed(3)}</span>
                        <span>{chunk.sourceUrl}</span>
                    </div>
                    <p>{chunk.content.slice(0, 240)}</p>
                </div>
            ))}
        </div>
    );
};

const DraftSection = ({ draft }: { draft: SimulationDraft }) => {
    const { t } = useTranslation();
    return (
        <div className={s.simulationBlock}>
            <h3>{t('Черновик ответа')}</h3>
            <p className={s.draftSubject}>{draft.subject}</p>
            <p className={s.draftBody}>{draft.body}</p>
        </div>
    );
};

const MetricsSection = ({ metrics }: { metrics: SimulationMetric[] }) => {
    const { t } = useTranslation();
    return (
        <div className={s.simulationBlock}>
            <h3>{t('Метрики')}</h3>
            {metrics.map((metric) => (
                <p key={metric.stage} className={s.simulationMetric}>
                    {t('{{stage}} · {{provider}}/{{model}} · {{durationMs}}мс{{tokens}}', {
                        stage: metric.stage, provider: metric.provider, model: metric.model, durationMs: metric.durationMs,
                        tokens: metric.totalTokens !== undefined ? ` · ${metric.promptTokens ?? 0}→${metric.completionTokens ?? 0} токенов` : '',
                    })}
                </p>
            ))}
        </div>
    );
};

const RunDetail = ({ detail, onClose }: { detail: SimulationRunDetail; onClose: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className={s.simulationResult}>
            <div className={s.header}>
                <h3>{t('Запуск #')}{detail.id}</h3>
                <button onClick={onClose}>{t('Закрыть')}</button>
            </div>
            <div className={s.simulationBlock}>
                <p className={s.simulationReason}>{detail.fromAddress} — {detail.subject}</p>
                <p className={s.draftBody}>{detail.body}</p>
            </div>
            {detail.classification && <ClassificationSection classification={detail.classification} />}
            <KnowledgeSection knowledge={detail.knowledge} />
            {detail.draft && <DraftSection draft={detail.draft} />}
            <MetricsSection metrics={detail.metrics} />
        </div>
    );
};

const ProviderFilterSelect = ({ value, onChange }: {
    value: '' | SimulationProvider; onChange: (value: '' | SimulationProvider) => void;
}) => {
    const { t } = useTranslation();
    return (
        <label className={s.historyFilter}>
            {t('История симуляций — провайдер')}
            <select className={s.historyFilterSelect} value={value} onChange={(e) => onChange(e.target.value as '' | SimulationProvider)}>
                <option value="">{t('Все провайдеры')}</option>
                <option value="OLLAMA">{t('Ollama (локально)')}</option>
                <option value="OPENAI">{t('OpenAI (облако)')}</option>
            </select>
        </label>
    );
};

const HistoryTableRow = ({ run, onOpen }: { run: SimulationRunSummary; onOpen: (id: number) => void }) => {
    const { t } = useTranslation();
    const { totalDurationMs, totalTokens } = summarizeMetrics(run.metrics);
    return (
        <tr onClick={() => onOpen(run.id)} className={s.clickableRow}>
            <td>{new Date(run.createdAt).toLocaleString()}</td>
            <td>{run.subject}</td>
            <td><span>{run.classificationPromptName ?? t('(активный)')}</span> / <span>{run.draftBodyPromptName ?? t('(активный)')}</span></td>
            <td>{run.draftProvider ? `${run.draftProvider}/${run.draftModel}` : '—'}</td>
            <td>{totalTokens || '—'}</td>
            <td>{totalDurationMs}{t('мс')}</td>
            <td>{outcomeLabel(run, t)}</td>
        </tr>
    );
};

const HistoryTable = ({ runs, onOpen }: { runs: SimulationRunSummary[]; onOpen: (id: number) => void }) => {
    const { t } = useTranslation();
    return (
        <div className={s.tableWrap}>
            <table className={s.table}>
                <thead>
                    <tr>
                        <th>{t('Дата')}</th>
                        <th>{t('Тема')}</th>
                        <th>{t('Промпты')}</th>
                        <th>{t('Провайдер/модель')}</th>
                        <th>{t('Токены')}</th>
                        <th>{t('Время')}</th>
                        <th>{t('Итог')}</th>
                    </tr>
                </thead>
                <tbody>
                    {runs.map((run) => <HistoryTableRow key={run.id} run={run} onOpen={onOpen} />)}
                    {!runs.length && <tr><td colSpan={7} className={s.empty}>{t('Симуляции ещё не запускались')}</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

export const SimulationHistoryPanel = ({
    runs, loading, page, setPage, total, totalPages, providerFilter, setProviderFilter, selectedRun, openRun, closeRun,
}: {
    runs: SimulationRunSummary[];
    loading: boolean;
    page: number;
    setPage: (page: number) => void;
    total: number;
    totalPages: number;
    providerFilter: '' | SimulationProvider;
    setProviderFilter: (value: '' | SimulationProvider) => void;
    selectedRun: SimulationRunDetail | null;
    openRun: (id: number) => void;
    closeRun: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <section className={s.card}>
            <div className={s.header}>
                <h2>{t('История симуляций')}</h2>
                <ProviderFilterSelect value={providerFilter} onChange={setProviderFilter} />
            </div>
            <HistoryTable runs={runs} onOpen={openRun} />
            <HistoryPagination page={page} totalPages={totalPages} total={total} loading={loading} onPageChange={setPage} />
            {selectedRun && <RunDetail detail={selectedRun} onClose={closeRun} />}
        </section>
    );
};
