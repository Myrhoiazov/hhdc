import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './MollieClientListItem.module.scss';
import { MollieClient } from '../../model/types/mollieClient';
import { Link } from 'react-router-dom';

interface MollieCustomerBadgesProps {
    client: MollieClient;
}

export const MollieCustomerBadges = memo(({ client }: MollieCustomerBadgesProps) => {
    const { t } = useTranslation();
    const subscriptionsCount = client.subscriptions?.length ?? 0;
    const activeSubscriptionsCount = client.subscriptions?.filter((subscription) => subscription.status === 'active').length ?? 0;
    const mandatesCount = client.mandates?.length ?? 0;
    const validMandatesCount = client.mandates?.filter((mandate) => mandate.status === 'valid').length ?? 0;
    const studentLinks = client.clientLinks?.length
        ? client.clientLinks
        : client.client?.id
            ? [{ id: `legacy-${client.client.id}`, client: client.client, payerRelation: client.payerRelation }]
            : [];

    return (
        <div className={s.badges}>
            <span className={classNames(s.badge, { [s.active]: activeSubscriptionsCount > 0 }, [])}>
                {t('Активные: {{count}}', { count: activeSubscriptionsCount })}
            </span>
            <span className={s.badge}>{t('Подписки: {{count}}', { count: subscriptionsCount })}</span>
            <span className={classNames(s.badge, { [s.active]: validMandatesCount > 0 }, [])}>
                {t('Мандаты: {{count}}', { count: mandatesCount })}
            </span>
            {studentLinks.length ? (
                studentLinks.map((link) => {
                    const studentName = [link.client?.firstName, link.client?.lastName].filter(Boolean).join(' ')
                        || link.client?.email
                        || (link.client?.id ? `Ученик #${link.client.id}` : 'Ученик');

                    return link.client?.id ? (
                        <Link className={`${s.badge} ${s.studentLink}`} to={`/clients/${link.client.id}`} key={link.id}>
                            {t('Ученик: {{studentName}}', { studentName })}
                        </Link>
                    ) : null;
                })
            ) : (
                <span className={`${s.badge} ${s.warning}`}>{t('Нет ученика')}</span>
            )}
            <span className={s.badge}>{t('Роль: {{role}}', { role: client.payerRelation || 'unknown' })}</span>
        </div>
    );
});