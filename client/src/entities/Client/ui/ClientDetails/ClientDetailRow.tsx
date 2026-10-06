import { memo, ReactNode } from 'react';
import { HStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import s from './ClientDetails.module.scss';

interface ClientDetailRowProps {
    label: string;
    value?: string;
    children?: ReactNode;
}

export const ClientDetailRow = memo(({ label, value, children }: ClientDetailRowProps) => (
    <HStack gap="32" align="start">
        <Text title={label} size="s" bold className={s.title} />
        {value !== undefined ? (
            <Text title={value} size="s" />
        ) : (
            children ?? <Text title="-" size="s" />
        )}
    </HStack>
));