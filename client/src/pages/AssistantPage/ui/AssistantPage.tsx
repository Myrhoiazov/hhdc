import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { askAssistant, AssistantAnswer } from '@/entities/Assistant';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import { CrmLayout } from '@/widgets/Page';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { AnswerPanel } from './AnswerPanel';
import { ReviewQueuePanel } from './ReviewQueuePanel';

export const AssistantPage = memo(() => {
    const { t } = useTranslation();
    const [result, setResult] = useState<AssistantAnswer>();
    const [version, setVersion] = useState(0);
    const action = useAction();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const question = String(new FormData(event.currentTarget).get('question'));
        void action.run(async () => {
            setResult(await askAssistant(question));
            setVersion((current) => current + 1);
        });
    };
    const onDecided = useCallback(() => {
        setResult(undefined);
        setVersion((current) => current + 1);
    }, []);
    return (
        <CrmLayout title="AI Assistant">
            <Panel as="form" onSubmit={submit}>
                <Field label="Ask about people, events, registrations or tasks">
                    <textarea name="question" rows={3} minLength={3} required />
                </Field>
                <p className={cls.muted}>
                    {t(
                        'The assistant reads only what your role may see and never changes data on its own.'
                    )}
                </p>
                <RequestState error={action.error} loading={action.busy} />
                <Button type="submit" disabled={action.busy}>
                    {t('Ask')}
                </Button>
            </Panel>
            {result && <AnswerPanel result={result} onDecided={onDecided} />}
            <ReviewQueuePanel version={version} />
        </CrmLayout>
    );
});
