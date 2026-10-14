import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    listChoreographers,
    RELATIONSHIP_STATUSES,
    RelationshipStatus,
} from '@/entities/Choreographer';
import { useCan } from '@/entities/User';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout } from '@/widgets/Page';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from '../Choreographers.module.scss';
import { ChoreographerRow } from './ChoreographerRow';
import { AddChoreographer } from './AddChoreographer';
import { Pager } from './ChoreographerPager';

export const ChoreographersPage = memo(() => {
    const { t } = useTranslation();
    const can = useCan();
    const [q, setQ] = useState('');
    const [status, setStatus] = useState<RelationshipStatus | ''>('');
    const [page, setPage] = useState(1);
    const load = useCallback(
        () => listChoreographers({ q, relationshipStatus: status }, page),
        [q, status, page]
    );
    const list = useResource(load);
    return (
        <CrmLayout title="Choreographers">
            <div className={own.filters}>
                <Field label="Search choreographers">
                    <input
                        value={q}
                        onChange={(event) => {
                            setQ(event.target.value);
                            setPage(1);
                        }}
                    />
                </Field>
                <Field label="Relationship">
                    <select
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value as RelationshipStatus | '');
                            setPage(1);
                        }}
                    >
                        <option value="">{t('Any status')}</option>
                        {RELATIONSHIP_STATUSES.map((value) => (
                            <option key={value} value={value}>
                                {t(value)}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>
            <RequestState error={list.error} loading={list.loading} />
            <Panel aria-label={t('Choreographers')}>
                {list.data?.data.map((item) => (
                    <ChoreographerRow key={item.person.id} item={item} />
                ))}
                {list.data?.total === 0 && (
                    <p className={cls.muted}>{t('No choreographers found')}</p>
                )}
                {list.data && <Pager page={page} total={list.data.total} onChange={setPage} />}
            </Panel>
            {can('choreographers.create') && <AddChoreographer />}
        </CrmLayout>
    );
});
