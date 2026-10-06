import { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './ClientListItem.module.scss';
import { Client } from '../../model/types/client';
import { Card } from '@/shared/ui/Card/Card';
import { Link } from 'react-router-dom';

interface ClientListItemBigProps {
    className?: string;
    client: Client;
    fullName: string;
    initials: string;
    profileRoute: string;
    hasPaymentAccount: boolean;
    renderAction?: (client: Client) => ReactNode;
}

export const ClientListItemBig = memo((props: ClientListItemBigProps) => {
    const { className, client, fullName, initials, profileRoute, hasPaymentAccount, renderAction } = props;

    return (
        <Card
            padding="16"
            fullWidth
            shadow="shadowLight"
            className={classNames(s.ClientListItem, {}, [className, s.BIG])}
        >
            <div className={s.row}>
                <p className={s.id}>{client.id}</p>
                <div className={s.identity}>
                    <Link to={profileRoute} className={s.rowAvatar}>
                        {typeof client.image === 'string' && client.image ? (
                            <img src={client.image} alt={fullName} />
                        ) : (
                            <span>{initials}</span>
                        )}
                    </Link>
                    <Link to={profileRoute} className={s.name}>{fullName}</Link>
                </div>
                <p className={s.email}>{client.email || '—'}</p>
                <p className={s.branch}>{client.branch?.name || '—'}</p>
                <span className={`${s.paymentBadge} ${hasPaymentAccount ? s.paymentLinked : s.paymentUnlinked}`}>
                    {hasPaymentAccount ? 'Привязана' : 'Нет'}
                </span>
                <div className={s.action}>{renderAction?.(client)}</div>
            </div>
        </Card>
    );
});