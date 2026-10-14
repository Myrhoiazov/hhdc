import { memo, ReactNode, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPerson, getPersonActivity, fullNameOf } from '@/entities/Person';
import { Can, useCan } from '@/entities/User';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Panel } from '@/shared/ui/Panel';
import { peopleListPath } from '../../model/peopleListUrl';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { PersonConversations } from './conversations/PersonConversations';
import { PersonExpenses } from '@/widgets/PersonExpenses';
import { PersonOrders } from './orders/PersonOrders';
import { PersonRemovalPanel } from '../PersonRemoval';
import { PersonTeamRoles } from './PersonTeamRoles';
import { PersonForm } from './PersonForm';
import { PersonProps } from './PersonRoles';
import { PersonSummary } from './PersonSummary';
import { PersonActivity } from './PersonActivity';
import own from './PersonPage.module.scss';

interface PersonBodyProps extends PersonProps {
    can: Can;
    activity: ReactNode;
    onDeleted: () => void;
}

// What happened with the contact takes the wide column; what can be changed about it stands beside.
const PersonBody = memo(({ person, can, activity, onSaved, onDeleted }: PersonBodyProps) => (
    <>
        <PersonSummary person={person} onSaved={onSaved} />
        <div className={own.columns}>
            <div className={own.main}>
                <PersonOrders personId={person.id} />
                <PersonConversations person={person} />
                <PersonTeamRoles personId={person.id} />
                {can('finance.read') && <PersonExpenses personId={person.id} />}
                {activity}
            </div>
            <aside className={own.side}>
                <PersonForm key={person.id} person={person} onSaved={onSaved} />
                {can('people.write') && (
                    <PersonRemovalPanel person={person} onDeleted={onDeleted} />
                )}
            </aside>
        </div>
    </>
));

export const PersonPage = memo(() => {
    const { id = '' } = useParams();
    const { t } = useTranslation();
    const load = useCallback(() => getPerson(id), [id]);
    const loadActivity = useCallback(() => getPersonActivity(id), [id]);
    const person = useResource(load);
    const activity = useResource(loadActivity);
    const navigate = useNavigate();
    const listPath = peopleListPath(useLocation().state);
    const can = useCan();
    const refresh = () => {
        void person.refresh();
        void activity.refresh();
    };
    const timeline = (
        <Panel aria-label={t('Activity timeline')}>
            <h2>{t('Activity timeline')}</h2>
            <RequestState error={activity.error} loading={activity.loading && !activity.data} />
            <PersonActivity activity={activity.data?.data} />
        </Panel>
    );
    return (
        <CrmLayout
            title={person.data ? fullNameOf(person.data) : 'Person'}
            back={{ to: listPath, label: 'Back to contacts' }}
        >
            <RequestState error={person.error} loading={person.loading && !person.data} />
            {person.data && (
                <PersonBody
                    person={person.data}
                    can={can}
                    activity={timeline}
                    onSaved={refresh}
                    onDeleted={() => navigate(listPath)}
                />
            )}
        </CrmLayout>
    );
});
