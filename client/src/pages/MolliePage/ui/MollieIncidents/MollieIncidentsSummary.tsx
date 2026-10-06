import { memo } from 'react';
import { HStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import s from './MollieIncidents.module.scss';

interface SummaryCard {
    label: string;
    value: number;
    accent: string;
}

interface MollieIncidentsSummaryProps {
    summaryCards: SummaryCard[];
}

export const MollieIncidentsSummary = memo(({ summaryCards }: MollieIncidentsSummaryProps) => (
    <HStack gap="16" max wrap="wrap" align="stretch">
        {summaryCards.map((card) => (
            <Card key={card.label} padding="16" className={`${s.summaryCard} ${s[card.accent]}`}>
                <Text text={card.label} size="s" />
                <Text title={String(card.value)} size="m" bold />
            </Card>
        ))}
    </HStack>
));
