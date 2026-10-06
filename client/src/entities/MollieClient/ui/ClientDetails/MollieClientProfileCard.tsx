import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CLIENT_LANGUAGE_LABELS } from '@/entities/Client';
import { Card } from '@/shared/ui/Card/Card';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { getClientDetailsData } from '../../model/selectors/clientDetails';
import { useSelector } from 'react-redux';
import s from './ClientDetails.module.scss';

export const MollieClientProfileCard = memo(() => {
    const { t } = useTranslation();
    const client = useSelector(getClientDetailsData);
    if (!client) return null;

    const fullName = [client.givenName, client.familyName].filter(Boolean).join(' ') || 'Без имени';
    const studentLinks = client.clientLinks?.length
        ? client.clientLinks
        : client.client?.id ? [{ id: `legacy-${client.client.id}`, client: client.client, payerRelation: client.payerRelation }] : [];
    const details = [
        ['Email', client.email], ['Payer relation', client.payerRelation], ['Link source', client.linkSource],
        ['Consumer name', client.consumerName], ['Consumer account', client.consumerAccount],
        ['Consumer BIC', client.consumerBic], ['Mollie ID', client.mollieId],
        ['Язык письма-напоминания', CLIENT_LANGUAGE_LABELS[client.preferredLanguage ?? 'RU']],
    ].filter(([, value]) => value);

    return (
        <Card padding="24" fullWidth className={s.detailsCard}>
            <VStack gap="16" max>
                <div><Text title={client.payerName || fullName} size="m" bold /><Text text="Платёжный профиль Mollie" size="s" className={s.subtitle} /></div>
                <div className={s.crmBlock}>
                    <span className={s.detailLabel}>{t('Ученики')}</span>
                    {studentLinks.length ? <div className={s.studentLinks}>{studentLinks.map((link) => <StudentLink key={link.id} link={link} />)}</div> : <span className={s.detailValue}>{t('Не привязан')}</span>}
                </div>
                <div className={s.detailsGrid}>
                    {details.map(([label, value]) => <div className={s.detailItem} key={label}><span className={s.detailLabel}>{label}</span><span className={s.detailValue}>{value}</span></div>)}
                </div>
            </VStack>
        </Card>
    );
});

type ClientLink = NonNullable<NonNullable<ReturnType<typeof getClientDetailsData>>['clientLinks']>[number];

const StudentLink = ({ link }: { link: ClientLink }) => {
    const studentName = [link.client?.firstName, link.client?.lastName].filter(Boolean).join(' ')
        || link.client?.email || (link.client?.id ? `Ученик #${link.client.id}` : 'Ученик');

    return link.client?.id ? <Link className={s.crmLink} to={`/clients/${link.client.id}`}>{studentName}</Link> : null;
};
