import { memo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getChoreographer } from '@/entities/Choreographer';
import { useCan } from '@/entities/User';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { ActivityTab } from '../tabs/ActivityTab';
import { BioVersions } from './BioVersions';
import { ContactsTab } from '../tabs/ContactsTab';
import { DocumentsTab } from '../tabs/DocumentsTab';
import { EmailsTab } from '../tabs/EmailsTab';
import { EventsTab } from '../tabs/EventsTab';
import { FinanceTab } from '../tabs/FinanceTab';
import { MediaTab } from '../tabs/MediaTab';
import { NotesTab } from '../tabs/NotesTab';
import { TABS, TabId } from '../../model/tabs';
import { ProfileHeader } from './ProfileHeader';
import { ProfileTabs } from './ProfileTabs';
import { OverviewTab } from './OverviewTab';
import { BiographyForm } from './BiographyForm';
import { BiographyView } from './BiographyView';

export const ChoreographerPage = memo(() => {
    const { id = '', tab } = useParams<{ id: string; tab?: string }>();
    const can = useCan();
    const load = useCallback(() => getChoreographer(id), [id]);
    const detail = useResource(load);
    const active: TabId = TABS.some((item) => item.id === tab && can(item.permission))
        ? (tab as TabId)
        : 'overview';
    const canEdit = can('choreographers.update');
    return (
        <CrmLayout title="Choreographer">
            <RequestState error={detail.error} loading={detail.loading && !detail.data} />
            {detail.data && (
                <>
                    <ProfileHeader detail={detail.data} />
                    <ProfileTabs personId={id} active={active} can={can} />
                    {active === 'overview' && <OverviewTab detail={detail.data} />}
                    {active === 'biography' && (
                        <>
                            {canEdit ? (
                                <BiographyForm
                                    key={detail.data.profile.updatedAt}
                                    detail={detail.data}
                                    onSaved={() => void detail.refresh()}
                                />
                            ) : (
                                <BiographyView detail={detail.data} />
                            )}
                            <BioVersions personId={id} canEdit={canEdit} />
                        </>
                    )}
                    {active === 'events' && (
                        <EventsTab personId={id} canManage={can('choreographers.events.manage')} />
                    )}
                    {active === 'finance' && (
                        <FinanceTab
                            personId={id}
                            rights={{
                                canWrite: can('choreographers.finance.write'),
                                canConfirm: can('choreographers.payments.confirm'),
                            }}
                        />
                    )}
                    {active === 'documents' && (
                        <DocumentsTab personId={id} canManage={can('documents.write')} />
                    )}
                    {active === 'emails' && (
                        <EmailsTab
                            personId={id}
                            canLink={can('choreographers.conversations.link')}
                        />
                    )}
                    {active === 'activity' && <ActivityTab personId={id} />}
                    {active === 'notes' && (
                        <NotesTab
                            personId={id}
                            canManageNotes={can('choreographers.notes.manage')}
                            canReadTasks={can('tasks.read')}
                            canManageTasks={can('tasks.write')}
                        />
                    )}
                    {active === 'media' && (
                        <MediaTab
                            personId={id}
                            canManage={can('choreographers.media.manage')}
                            onChanged={() => void detail.refresh()}
                        />
                    )}
                    {active === 'contacts' && (
                        <ContactsTab
                            personId={id}
                            canManage={can('choreographers.contacts.manage')}
                        />
                    )}
                </>
            )}
        </CrmLayout>
    );
});
