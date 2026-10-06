import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { IncidentCustomer, MollieIncident } from './useMollieIncidents';
import s from './MollieIncidents.module.scss';

const formatAmount = (incident: MollieIncident) => {
    if (incident.amountValue === undefined || incident.amountValue === null) {
        return '—';
    }

    const amount = Number(incident.amountValue);

    return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: incident.amountCurrency || 'EUR',
    }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDate = (value?: string) => {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const getCustomerName = (customer?: IncidentCustomer | null) => {
    if (!customer) {
        return 'Платёжный профиль не привязан';
    }

    return customer.payerName
        || [customer.givenName, customer.familyName].filter(Boolean).join(' ')
        || customer.email
        || customer.mollieId
        || `Профиль #${customer.id}`;
};

const getCrmClientName = (customer?: IncidentCustomer | null) => {
    const crmClient = customer?.clientLinks?.[0]?.client || customer?.client;

    if (!crmClient) {
        return 'Ученик не привязан';
    }

    return [crmClient.firstName, crmClient.lastName].filter(Boolean).join(' ')
        || crmClient.email
        || `Ученик #${crmClient.id}`;
};

const getStudentLinks = (customer?: IncidentCustomer | null) => (
    customer?.clientLinks?.length
        ? customer.clientLinks
        : customer?.client?.id
            ? [{ id: customer.client.id, client: customer.client }]
            : []
);

const getIncidentHint = (incident: MollieIncident) => {
    if (incident.type === 'payment') {
        return 'Проверьте автосписание и свяжитесь с клиентом при необходимости.';
    }

    if (incident.type === 'subscription') {
        return 'У активной подписки нет валидного mandate — автосписание может не пройти.';
    }

    if (incident.status === 'missing_crm_client') {
        return 'Свяжите платёжный профиль Mollie с учеником, чтобы администратор видел оплату в карточке ученика.';
    }

    return 'Добавьте email, чтобы профиль клиента был пригоден для администрирования.';
};

interface MollieIncidentCardProps {
    incident: MollieIncident;
    isResolving: boolean;
    onResolve: (incident: MollieIncident) => void;
}

const IncidentSummary = ({ incident }: { incident: MollieIncident }) => (
    <div className={s.mainInfo}>
        <HStack gap="8" align="center">
            <span className={`${s.badge} ${s[incident.type]}`}>{incident.type}</span>
            <span className={`${s.status} ${s[incident.severity]}`}>{incident.status}</span>
        </HStack>
        <Text title={incident.title} size="s" bold />
        <Text text={incident.description || getIncidentHint(incident)} size="s" className={s.mutedText} />
    </div>
);

const IncidentClientInfo = ({ incident }: { incident: MollieIncident }) => {
    const { t } = useTranslation();
    const studentLinks = getStudentLinks(incident.customer);

    return (
        <div className={s.clientInfo}>
            <Text text="Плательщик / ученик" size="s" className={s.label} />
            {incident.customer?.id ? (
                <Link className={s.link} to={`/mollie/customers/${incident.customer.id}`}>
                    {getCustomerName(incident.customer)}
                </Link>
            ) : (
                <Text text={getCustomerName(incident.customer)} bold />
            )}
            <Text text={incident.customer?.email || incident.customer?.mollieId || '—'} size="s" className={s.mutedText} />
            {studentLinks.length ? (
                <div className={s.studentLinks}>
                    {studentLinks.map((link) => (
                        link.client?.id ? (
                            <Link className={s.crmLink} to={`/clients/${link.client.id}`} key={link.id}>
                                {t('Ученик: {{name}}', { name: [link.client.firstName, link.client.lastName].filter(Boolean).join(' ') || link.client.email || `#${link.client.id}` })}
                            </Link>
                        ) : null
                    ))}
                </div>
            ) : (
                <Text text={getCrmClientName(incident.customer)} size="s" className={s.mutedText} />
            )}
        </div>
    );
};

const IncidentField = ({ label, value }: { label: string; value: string }) => (
    <div>
        <Text text={label} size="s" className={s.label} />
        <Text text={value} bold />
    </div>
);

const IncidentActions = ({
    incident,
    isResolving,
    onResolve,
}: {
    incident: MollieIncident;
    isResolving: boolean;
    onResolve: (incident: MollieIncident) => void;
}) => {
    const { t } = useTranslation();
    const studentLinks = getStudentLinks(incident.customer);

    return (
        <div className={s.actions}>
            <Button
                className={s.resolveButton}
                theme={ButtonTheme.OUTLINE}
                disabled={isResolving}
                onClick={() => onResolve(incident)}
            >
                {isResolving ? 'Сохраняем...' : 'Пометить решённым'}
            </Button>
            {incident.customer?.id && (
                <Link className={s.actionLink} to={`/mollie/customers/${incident.customer.id}`}>
                    {t('Открыть клиента')}
                </Link>
            )}
            {incident.type === 'payment' && (
                <Link className={s.actionLink} to="/mollie/payments">
                    {t('Все платежи')}
                </Link>
            )}
            {studentLinks[0]?.client?.id && (
                <Link className={s.actionLink} to={`/clients/${studentLinks[0].client?.id}`}>
                    {t('Открыть ученика')}
                </Link>
            )}
        </div>
    );
};

export const MollieIncidentCard = memo(({ incident, isResolving, onResolve }: MollieIncidentCardProps) => {
    return (
        <Card padding="16" fullWidth className={`${s.incidentCard} ${s[incident.severity]}`}>
            <div className={s.incidentGrid}>
                <IncidentSummary incident={incident} />
                <IncidentClientInfo incident={incident} />

                <IncidentField label="Сумма" value={formatAmount(incident)} />

                <IncidentField label="Дата" value={formatDate(incident.updatedAt || incident.createdAt)} />

                <IncidentActions incident={incident} isResolving={isResolving} onResolve={onResolve} />
            </div>
        </Card>
    );
});
