import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { SimulationKnowledge, SimulationView } from '@/entities/EmailSimulation';
import { Badge } from '@/shared/ui/Badge';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from '../Knowledge.module.scss';

const LAYER_TITLES: Record<string, string> = {
    rules: 'Business rules',
    facts: 'Current facts',
    faq: 'FAQ',
    examples: 'Style examples',
};

const ClassificationSection = memo(({ simulation }: { simulation: SimulationView }) => {
    const { t } = useTranslation();
    const { classification, trace } = simulation;
    return (
        <div className={own.badges}>
            <Badge>
                {t('Language')}: {trace?.language ?? classification.replyLanguage}
            </Badge>
            <Badge>
                {t('Intent')}:{' '}
                {[
                    trace?.intent ?? classification.intent,
                    ...(trace?.secondaryIntents ?? classification.secondaryIntents),
                ].join(' + ')}
            </Badge>
            {trace && (
                <Badge>
                    {t('Event year')}: {trace.eventYear}
                </Badge>
            )}
            <Badge tone={classification.spam ? 'danger' : undefined}>
                {t(classification.spam ? 'Spam' : 'Not spam')}
            </Badge>
            <Badge>{t(classification.needsReply ? 'Needs a reply' : 'No reply needed')}</Badge>
            {trace?.needsCRM && (
                <Badge>{t(trace.crmFound ? 'CRM record used' : 'CRM record needed')}</Badge>
            )}
            {trace?.needsHumanAction && <Badge tone="danger">{t('Staff action required')}</Badge>}
        </div>
    );
});

const DraftSection = memo(({ simulation }: { simulation: SimulationView }) => {
    const { t } = useTranslation();
    const { draft, trace } = simulation;
    if (!draft)
        return (
            <p className={cls.muted}>{t('The assistant would not draft a reply to this email.')}</p>
        );
    return (
        <>
            <div className={own.badges}>
                <Badge tone={draft.needsStaffReview ? 'danger' : 'success'}>
                    {t(draft.needsStaffReview ? 'Needs staff review' : 'Ready for approval')}
                </Badge>
                {trace && <Badge>{t(trace.answerability)}</Badge>}
                <Badge>
                    {t('Confidence')}: {Math.round(draft.confidence * 100)}%
                </Badge>
                {trace && (
                    <Badge>
                        {t('Attempts')}: {trace.attempts}
                    </Badge>
                )}
            </div>
            <pre className={own.draft}>{draft.body}</pre>
            {Boolean(trace?.warnings.length) && (
                <ul className={own.warnings} aria-label={t('Warnings')}>
                    {trace?.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                    ))}
                </ul>
            )}
        </>
    );
});

const KnowledgeSection = memo(({ knowledge }: { knowledge: SimulationKnowledge[] }) => {
    const { t } = useTranslation();
    if (!knowledge.length)
        return <p className={cls.muted}>{t('No knowledge was found for this email.')}</p>;
    return (
        <div className={own.knowledge}>
            {knowledge.map((item) => (
                <details key={`${item.layer}:${item.chunkId}`}>
                    <summary>
                        <Badge>{t(LAYER_TITLES[item.layer] ?? item.layer)}</Badge> {item.chunkId} ·{' '}
                        {item.score.toFixed(2)}
                    </summary>
                    <pre>{item.content}</pre>
                </details>
            ))}
        </div>
    );
});

const MetricsSection = memo(({ simulation }: { simulation: SimulationView }) => {
    const { t } = useTranslation();
    return (
        <div className={own.metrics}>
            {simulation.metrics.map((metric) => (
                <p key={metric.stage}>
                    {`${t(metric.stage)} · ${metric.provider}/${metric.model} · ${metric.durationMs} ${t('ms')} · ${metric.promptTokens}→${metric.completionTokens} ${t('tokens')} · ${t('Calls')}: ${metric.calls}`}
                </p>
            ))}
            {!simulation.metrics.length && <p>{t('The model was not called.')}</p>}
            <p>{simulation.promptVersion}</p>
        </div>
    );
});

export const SimulationResult = memo(({ simulation }: { simulation: SimulationView }) => {
    const { t } = useTranslation();
    return (
        <div className={own.result} aria-label={t('Simulation result')} role="region">
            <ClassificationSection simulation={simulation} />
            <h3>{t('Draft')}</h3>
            <DraftSection simulation={simulation} />
            <h3>{t('Knowledge given to the model')}</h3>
            <KnowledgeSection knowledge={simulation.knowledge} />
            <h3>{t('Metrics')}</h3>
            <MetricsSection simulation={simulation} />
        </div>
    );
});
