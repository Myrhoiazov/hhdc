import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Text } from '@/shared/ui/Text/Text';
import type { ClientPayerLink } from './types';
import { getPayerName } from './helpers';
import s from './ClientPaymentBlock.module.scss';

interface ClientPayersSectionProps {
    payers?: ClientPayerLink[];
}

export const ClientPayersSection = memo((props: ClientPayersSectionProps) => {
    const { payers } = props;

    return (
        <div className={s.section}>
            <Text title="Плательщики" size="s" bold />
            {payers?.length ? payers.map((payer) => (
                <div className={s.row} key={payer.id}>
                    <div className={s.rowMain}>
                        <Link className={s.link} to={`/mollie/customers/${payer.customer?.id}`}>
                            {getPayerName(payer.customer)}
                        </Link>
                        <span>{payer.payerRelation || 'unknown'} · {payer.linkSource || 'manual'}{payer.isPrimary ? ' · primary' : ''}</span>
                    </div>
                    <span>{payer.customer?.email || payer.customer?.mollieId || '—'}</span>
                </div>
            )) : (
                <Text text="Платёжный профиль пока не привязан." size="s" />
            )}
        </div>
    );
});
