import { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './ClientListItem.module.scss';
import { Client } from '../../model/types/client';
import { Card } from '@/shared/ui/Card/Card';
import { Link } from 'react-router-dom';

interface ClientListItemSmallProps {
    className?: string;
    client: Client;
    fullName: string;
    initials: string;
    profileRoute: string;
    hasPaymentAccount: boolean;
    renderAction?: (client: Client) => ReactNode;
}

export const ClientListItemSmall = memo((props: ClientListItemSmallProps) => {
    const { className, client, fullName, initials, profileRoute, hasPaymentAccount, renderAction } = props;

    return (
        <Card padding="16" className={classNames(s.ClientListItem, {}, [className, s.SMALL])}>
            <div className={s.tileHeader}>
                <Link to={profileRoute} className={s.avatar}>
                    {typeof client.image === 'string' && client.image ? (
                        <img src={client.image} alt={fullName} />
                    ) : (
                        <span>{initials}</span>
                    )}
                </Link>
                <div className={s.action}>{renderAction?.(client)}</div>
            </div>
            <Link to={profileRoute} className={s.tileName}>{fullName}</Link>
            <div className={s.tileDetails}>
                <span>{client.email || 'Email не указан'}</span>
                <span>{client.phoneNumber || 'Телефон не указан'}</span>
                <span>{client.branch?.name || 'Без филиала'}</span>
            </div>
            <div className={s.tileFooter}>
                <span className={`${s.paymentBadge} ${hasPaymentAccount ? s.paymentLinked : s.paymentUnlinked}`}>
                    {hasPaymentAccount ? 'Оплата привязана' : 'Нет платёжного аккаунта'}
                </span>
            </div>
        </Card>
    );
});