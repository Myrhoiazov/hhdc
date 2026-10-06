import { useTranslation } from 'react-i18next';
import { ChangeEvent } from 'react';
import { EmailSimulationForm, EmailSimulationResult, SimulationMetric, SimulationStage } from '../emailSimulationTypes';
import { AiPrompt } from '../promptLibraryTypes';
import s from './KnowledgeBasePage.module.scss';

const textInput = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder?: string,
) => (
    <label>{label}
        <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
);

const promptSelect = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: AiPrompt[],
    activeLabel: string,
) => (
    <label>{label}
        <select value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">{activeLabel}</option>
            {options.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>{prompt.name}{prompt.isActive ? ' ★' : ''}</option>
            ))}
        </select>
    </label>
);

const formatMetric = (metric: SimulationMetric): string => {
    const tokens = metric.totalTokens !== undefined ? ` · ${metric.promptTokens ?? 0}→${metric.completionTokens ?? 0} токенов` : '';
    const calls = metric.callCount > 1 ? ` · ${metric.callCount} вызовов` : '';
    return `${metric.model} · ${metric.durationMs}мс${tokens}${calls}`;
};

const MetricLine = ({ result, stage }: { result: EmailSimulationResult; stage: SimulationStage }) => {
    const metric = result.metrics.find((candidate) => candidate.stage === stage);
    if (!metric) return null;
    return <p className={s.simulationMetric}>{formatMetric(metric)}</p>;
};

const SimulationForm = ({ form, setForm, running, run, classificationPrompts, draftBodyPrompts }: {
    form: EmailSimulationForm;
    setForm: (form: EmailSimulationForm) => void;
    running: boolean;
    run: () => void;
    classificationPrompts: AiPrompt[];
    draftBodyPrompts: AiPrompt[];
}) => {
    const { t } = useTranslation();
    return (
        <>
            <div className={s.grid}>
                {textInput(t('От кого (email)'), form.from, (value) => setForm({ ...form, from: value }), 'test@example.com')}
                {textInput(t('Тема письма *'), form.subject, (value) => setForm({ ...form, subject: value }))}
                {textInput(t('topK (по умолчанию из конфига)'), form.topK, (value) => setForm({ ...form, topK: value }), '4')}
            </div>
            <div className={s.grid}>
                {promptSelect(t('Промпт классификации'), form.classificationPromptId, (value) => setForm({ ...form, classificationPromptId: value }), classificationPrompts, t('(активный)'))}
                {promptSelect(t('Промпт черновика'), form.draftBodyPromptId, (value) => setForm({ ...form, draftBodyPromptId: value }), draftBodyPrompts, t('(активный)'))}
            </div>
            <label className={s.textareaLabel}>{t('Текст письма *')}
                <textarea
                    className={s.textarea}
                    rows={5}
                    value={form.body}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, body: e.target.value })}
                />
            </label>
            <div className={s.simulationOptions}>
                <label className={s.check}>
                    <input type="checkbox" checked={form.noKnowledge} onChange={(e) => setForm({ ...form, noKnowledge: e.target.checked })} />
                    {t('Без поиска по базе знаний')}
                </label>
                <label className={s.check}>
                    <input type="checkbox" checked={form.forceDraft} onChange={(e) => setForm({ ...form, forceDraft: e.target.checked })} />
                    {t('Сформировать черновик, даже если это спам / не требует ответа')}
                </label>
                <label className={s.check}>
                    <input type="checkbox" checked={form.noQueryExpansion} onChange={(e) => setForm({ ...form, noQueryExpansion: e.target.checked })} />
                    {t('Без расширения запроса')}
                </label>
                <label className={s.check}>
                    <input type="checkbox" checked={form.noRerank} onChange={(e) => setForm({ ...form, noRerank: e.target.checked })} />
                    {t('Без реранкинга')}
                </label>
                <button className={s.primary} disabled={running} onClick={run}>{running ? t('Выполняется...') : t('Запустить симуляцию')}</button>
            </div>
        </>
    );
};

const ClassificationBlock = ({ result }: { result: EmailSimulationResult }) => {
    const { t } = useTranslation();
    if (result.deterministicSpamReason) {
        return (
            <div className={s.simulationBlock}>
                <h3>{t('Детерминированная проверка на спам')}</h3>
                <p className={s.simulationSpam}>
                    {t('СПАМ')} ({result.deterministicSpamReason}) {t('— реальный пайплайн остановился бы здесь')}
                </p>
            </div>
        );
    }
    if (!result.classification) return null;
    const c = result.classification;
    return (
        <div className={s.simulationBlock}>
            <h3>{t('Классификация')}</h3>
            <MetricLine result={result} stage="CLASSIFICATION" />
            <div className={s.simulationFields}>
                <span>{t('spam:')} <strong>{String(c.spam)}</strong></span>
                <span>{t('needsReply:')} <strong>{String(c.needsReply)}</strong></span>
                <span>{t('language:')} <strong>{c.language}</strong></span>
                <span>{t('intent:')} <strong>{c.intent}</strong></span>
                <span>{t('confidence:')} <strong>{c.confidence.toFixed(2)}</strong></span>
            </div>
            {c.reason && <p className={s.simulationReason}>{c.reason}</p>}
        </div>
    );
};

const KnowledgeBlock = ({ result }: { result: EmailSimulationResult }) => {
    const { t } = useTranslation();
    if (!result.classification && !result.deterministicSpamReason) return null;
    return (
        <div className={s.simulationBlock}>
            <h3>{t('Найденные знания (RAG retrieval)')}</h3>
            <MetricLine result={result} stage="QUERY_EXPANSION" />
            <MetricLine result={result} stage="RETRIEVAL_EMBEDDING" />
            <MetricLine result={result} stage="RERANK" />
            {result.queryExpansion && (
                <p className={s.simulationReason}>
                    {t('Расширенный запрос:')} {result.queryExpansion.cleanQuery}{t(' — ключевые слова:')} {result.queryExpansion.keywords.join(', ')}
                </p>
            )}
            {!result.knowledge.length && <p>{t('Ничего релевантного не найдено')}</p>}
            {result.knowledge.map((chunk) => (
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

const DraftBlock = ({ result }: { result: EmailSimulationResult }) => {
    const { t } = useTranslation();
    if (result.deterministicSpamReason) return null;
    if (!result.classification) return null;
    if (result.draftSkippedReason) {
        return (
            <div className={s.simulationBlock}>
                <h3>{t('Черновик ответа')}</h3>
                <p>{t('Пропущен:')} {result.draftSkippedReason}</p>
            </div>
        );
    }
    if (!result.draft) return null;
    const d = result.draft;
    return (
        <div className={s.simulationBlock}>
            <h3>{t('Черновик ответа')}</h3>
            <MetricLine result={result} stage="DRAFT" />
            <div className={s.simulationFields}>
                <span>{t('replyLanguage:')} <strong>{d.replyLanguage}</strong></span>
                <span>{t('confidence:')} <strong>{d.confidence.toFixed(2)}</strong></span>
                <span>{t('needsManualAnswer:')} <strong>{String(d.needsManualAnswer)}</strong></span>
            </div>
            <p className={s.draftSubject}>{d.subject}</p>
            <p className={s.draftBody}>{d.body}</p>
            {result.crmContact && (
                <p className={s.simulationReason}>
                    {t('Клиент в CRM:')} {result.crmContact.firstName} {result.crmContact.lastName}
                </p>
            )}
        </div>
    );
};

export const EmailSimulationPanel = ({ form, setForm, running, result, run, prompts }: {
    form: EmailSimulationForm;
    setForm: (form: EmailSimulationForm) => void;
    running: boolean;
    result: EmailSimulationResult | null;
    run: () => void;
    prompts: AiPrompt[];
}) => {
    const { t } = useTranslation();
    const classificationPrompts = prompts.filter((prompt) => prompt.slot === 'CLASSIFICATION');
    const draftBodyPrompts = prompts.filter((prompt) => prompt.slot === 'DRAFT_BODY');
    return (
        <section className={s.card}>
            <h2>{t('Симуляция письма')}</h2>
            <p className={s.simulationHint}>
                {t('Прогоняет тему и текст письма через реальный пайплайн (нормализация → проверка на спам → классификация → поиск по базе знаний → черновик) без записи в почту и без уведомлений в Telegram.')}
            </p>
            <SimulationForm form={form} setForm={setForm} running={running} run={run} classificationPrompts={classificationPrompts} draftBodyPrompts={draftBodyPrompts} />
            {result && (
                <div className={s.simulationResult}>
                    <ClassificationBlock result={result} />
                    <KnowledgeBlock result={result} />
                    <DraftBlock result={result} />
                </div>
            )}
        </section>
    );
};
