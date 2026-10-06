import { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './MollieClientListItem.module.scss';
import { MollieClient } from '../../model/types/mollieClient';
import { HStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { useNavigate } from 'react-router-dom';
import { MollieCustomerBadges } from './MollieCustomerBadges';

interface MollieClientListItemProps {
    className?: string;
    client: MollieClient;
    renderAction?: (client: MollieClient) => ReactNode;
}

const MollieClientListItem = (props: MollieClientListItemProps) => {
    const { className, client, renderAction } = props;
    const navigate = useNavigate();
    const payerName = client.payerName || [client.givenName, client.familyName].filter(Boolean).join(' ') || client.email || 'Плательщик';
    const initials = [client.givenName, client.familyName]
        .filter(Boolean)
        .map((part) => part?.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2) || payerName.charAt(0).toUpperCase() || '?';

    return (
        <Card
            padding="16"
            fullWidth
            shadow="shadowLight"
            className={classNames(s.MollieClientListItem, {}, [className])}
        >
            <HStack max justify="between">
                <div
                    className={classNames(s.info, {}, [s.clickable])}
                    onClick={() => navigate(`/company/customers/${client.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/company/customers/${client.id}`)}
                >
                    <p className={s.id}>{client.id}</p>
                    <div className={s.identity}>
                        <span className={s.avatar}>{initials}</span>
                        <p className={s.name}>{payerName}</p>
                    </div>
                    <p className={s.email}>{client.email}</p>
                    <MollieCustomerBadges client={client} />
                </div>
                {renderAction?.(client)}
            </HStack>
        </Card>
    );
};

export default memo(MollieClientListItem);