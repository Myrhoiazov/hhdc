import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { AssistantAnswer } from '@/entities/Assistant';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { ProposalCard } from './ProposalCard';

export const AnswerPanel = memo(
    ({ result, onDecided }: { result: AssistantAnswer; onDecided: () => void }) => {
        const { t } = useTranslation();
        return (
            <Panel>
                <p>{result.answer}</p>
                {result.references.length > 0 && (
                    <p className={cls.muted}>
                        {t('Sources')}: {result.references.map((item) => item.tool).join(', ')}
                    </p>
                )}
                {result.proposal && (
                    <ProposalCard proposal={result.proposal} onDecided={onDecided} />
                )}
            </Panel>
        );
    }
);
