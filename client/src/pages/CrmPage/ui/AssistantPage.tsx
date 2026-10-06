import { FormEvent, memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AiProposal, askAssistant, AssistantAnswer, decideProposal, getReviewQueue } from '@/entities/crm';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState } from './common';
import cls from './CrmPage.module.scss';

// A proposal changes nothing until the staff member confirms it here.
const ProposalCard = memo(({ proposal, onDecided }: { proposal: AiProposal; onDecided: () => void }) => {
    const { t } = useTranslation();
    const action = useAction(onDecided);
    return <div className={cls.result}>
        <h3>{t('Create task?')}</h3>
        <p><strong>{proposal.payload.title}</strong></p>
        {proposal.payload.description && <p>{proposal.payload.description}</p>}
        {proposal.payload.dueDate && <p className={cls.muted}>{t('Due')}: {new Date(proposal.payload.dueDate).toLocaleDateString()}</p>}
        <RequestState error={action.error} loading={false} />
        <div className={cls.actions}>
            <Button disabled={action.busy} onClick={() => void action.run(() => decideProposal(proposal.id, 'reject'))}>{t('Cancel')}</Button>
            <Button disabled={action.busy} onClick={() => void action.run(() => decideProposal(proposal.id, 'confirm'))}>{t('Confirm')}</Button>
        </div>
    </div>;
});

const AnswerPanel = memo(({ result, onDecided }: { result: AssistantAnswer; onDecided: () => void }) => {
    const { t } = useTranslation();
    return <section className={cls.panel}>
        <p>{result.answer}</p>
        {result.references.length > 0 && <p className={cls.muted}>{t('Sources')}: {result.references.map(item => item.tool).join(', ')}</p>}
        {result.proposal && <ProposalCard proposal={result.proposal} onDecided={onDecided} />}
    </section>;
});

const ReviewQueuePanel = memo(({ version }: { version: number }) => {
    const { t } = useTranslation();
    const load = useCallback(() => getReviewQueue(), [version]); // eslint-disable-line react-hooks/exhaustive-deps
    const queue = useResource(load);
    const refresh = useCallback(() => { void queue.refresh(); }, [queue]);
    return <section className={cls.panel}>
        <h2>{t('AI Review Queue')}</h2>
        <RequestState error={queue.error} loading={queue.loading} />
        {queue.data && <>
            <div className={cls.row}><Link to="/email">{t('Draft replies')}</Link><strong>{queue.data.drafts.length}</strong></div>
            <div className={cls.row}><span>{t('Low-confidence classifications')}</span><strong>{queue.data.lowConfidenceDrafts}</strong></div>
            <div className={cls.row}><Link to="/people/duplicates">{t('Duplicate suggestions')}</Link><strong>{queue.data.duplicates.length}</strong></div>
            <h3>{t('Action proposals')}</h3>
            {queue.data.proposals.length === 0 && <p className={cls.muted}>{t('Nothing awaits confirmation')}</p>}
            {queue.data.proposals.map(item => <ProposalCard key={item.id} proposal={item} onDecided={refresh} />)}
        </>}
    </section>;
});

export const AssistantPage = memo(() => {
    const { t } = useTranslation();
    const [result, setResult] = useState<AssistantAnswer>();
    const [version, setVersion] = useState(0);
    const action = useAction();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const question = String(new FormData(event.currentTarget).get('question'));
        void action.run(async () => { setResult(await askAssistant(question)); setVersion(current => current + 1); });
    };
    const onDecided = useCallback(() => { setResult(undefined); setVersion(current => current + 1); }, []);
    return <CrmLayout title="AI Assistant">
        <form className={cls.panel} onSubmit={submit}>
            <Field label="Ask about people, events, registrations or tasks"><textarea name="question" rows={3} minLength={3} required /></Field>
            <p className={cls.muted}>{t('The assistant reads only what your role may see and never changes data on its own.')}</p>
            <RequestState error={action.error} loading={action.busy} />
            <Button type="submit" disabled={action.busy}>{t('Ask')}</Button>
        </form>
        {result && <AnswerPanel result={result} onDecided={onDecided} />}
        <ReviewQueuePanel version={version} />
    </CrmLayout>;
});
