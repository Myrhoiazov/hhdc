import { memo } from 'react';
import { ClientLanguage } from '@/entities/Client';
import { MollieClient } from '../../model/types/mollieClient';
import { MollieClientCardProfileFields } from './MollieClientCardProfileFields';
import { MollieClientCardAccountFields } from './MollieClientCardAccountFields';
import { MollieClientCardContactFields } from './MollieClientCardContactFields';

export interface MollieClientCardProps {
    className?: string;
    data?: MollieClient;
    error?: string;
    isLoading?: boolean;
    readonly?: boolean;
    onChangeLastName?: (value?: string) => void;
    onChangeFirstName?: (value?: string) => void;
    onChangeCity?: (value?: string) => void;
    onChangeEmail?: (value?: string) => void;
    onChangeConsumerAccount?: (value?: string) => void;
    onChangeConsumerBic?: (value?: string) => void;
    onChangeConsumerName?: (value?: string) => void;
    onChangePreferredLanguage?: (value?: ClientLanguage) => void;
    mode?: 'create' | 'edit';
}

export const MollieClientCard = memo((props: MollieClientCardProps) => {
    const {
        data,
        readonly,
        onChangeFirstName,
        onChangeLastName,
        onChangeEmail,
        onChangeCity,
        onChangeConsumerAccount,
        onChangeConsumerBic,
        onChangeConsumerName,
        onChangePreferredLanguage,
        mode = 'edit',
    } = props;

    return (
        <>
            <MollieClientCardProfileFields
                data={data}
                onChangeFirstName={onChangeFirstName}
                onChangeLastName={onChangeLastName}
            />
            {mode === 'edit' && (
                <MollieClientCardAccountFields
                    data={data}
                    onChangeConsumerAccount={onChangeConsumerAccount}
                    onChangeConsumerBic={onChangeConsumerBic}
                    onChangeConsumerName={onChangeConsumerName}
                />
            )}
            <MollieClientCardContactFields
                data={data}
                onChangeCity={onChangeCity}
                onChangeEmail={onChangeEmail}
                onChangePreferredLanguage={onChangePreferredLanguage}
                readonly={readonly}
                minimal={mode === 'create'}
            />
        </>
    );
});

export default MollieClientCard;
