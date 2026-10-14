import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/shared/lib/format/date';
import { Panel } from '@/shared/ui/Panel';
import { PersonProps, PersonRoles } from './PersonRoles';
import own from './PersonPage.module.scss';

const Fact = memo(({ label, children }: { label: string; children: ReactNode }) => {
    const { t } = useTranslation();
    return (
        <div className={own.fact}>
            <dt className={own.label}>{t(label)}</dt>
            <dd>{children}</dd>
        </div>
    );
});

const contactLink = (scheme: 'mailto' | 'tel', value?: string | null) =>
    value ? <a href={`${scheme}:${value}`}>{value}</a> : '—';

// Who the contact is, read at a glance: the form below is for changing it, not for reading it.
export const PersonSummary = memo(({ person, onSaved }: PersonProps) => {
    const { t } = useTranslation();
    return (
        <Panel aria-label={t('Contact summary')}>
            <dl className={own.facts}>
                <Fact label="Email">{contactLink('mailto', person.email)}</Fact>
                <Fact label="Phone">{contactLink('tel', person.phone)}</Fact>
                <Fact label="Country">{person.country || '—'}</Fact>
                <Fact label="Source">
                    {person.source
                        ? t(`Person source: ${person.source}`, { defaultValue: person.source })
                        : '—'}
                </Fact>
                <Fact label="Added">{person.createdAt ? formatDate(person.createdAt) : '—'}</Fact>
            </dl>
            <PersonRoles person={person} onSaved={onSaved} />
        </Panel>
    );
});
