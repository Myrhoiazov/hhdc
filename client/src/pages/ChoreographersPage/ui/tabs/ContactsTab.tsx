import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ChoreographerContact,
    deactivateChoreographerContact,
    listChoreographerContacts,
    updateChoreographerContact,
} from '@/entities/Choreographer';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { ContactRow } from './ContactRow';
import { ContactForm } from './ContactForm';

export const ContactsTab = memo(
    ({ personId, canManage }: { personId: string; canManage: boolean }) => {
        const { t } = useTranslation();
        const load = useCallback(() => listChoreographerContacts(personId), [personId]);
        const contacts = useResource(load);
        const [error, setError] = useState('');
        const act = (work: Promise<unknown>) => {
            setError('');
            work.then(() => contacts.refresh()).catch((cause) =>
                setError(cause instanceof Error ? cause.message : t('Request failed'))
            );
        };
        const makePrimary = (contact: ChoreographerContact) =>
            act(updateChoreographerContact(personId, contact.id, { isPrimary: true }));
        const deactivate = (contact: ChoreographerContact) =>
            act(deactivateChoreographerContact(personId, contact.id));
        return (
            <>
                <RequestState
                    error={error || contacts.error}
                    loading={contacts.loading && !contacts.data}
                />
                <Panel aria-label={t('Contacts')}>
                    <h2>{t('Contacts')}</h2>
                    <p className={cls.muted}>
                        {t(
                            'Managers, agents and other people who represent this choreographer. The main address is on the contact card.'
                        )}
                    </p>
                    {contacts.data?.map((contact) => (
                        <ContactRow
                            key={contact.id}
                            contact={contact}
                            canManage={canManage}
                            onMakePrimary={makePrimary}
                            onDeactivate={deactivate}
                        />
                    ))}
                    {contacts.data?.length === 0 && (
                        <p className={cls.muted}>{t('No additional contacts yet.')}</p>
                    )}
                </Panel>
                {canManage && (
                    <ContactForm personId={personId} onSaved={() => void contacts.refresh()} />
                )}
            </>
        );
    }
);
