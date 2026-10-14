import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { deletePerson, Person } from '@/entities/Person';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';

const personName = (person: Person) => person.displayName || `${person.firstName} ${person.lastName}`.trim() || person.email || '';

interface DeleteProps { person: Person; onDeleted: () => void }

export const DeleteContactButton = memo(({ person, onDeleted }: DeleteProps) => {
    const { t } = useTranslation();
    const remove = async () => { await deletePerson(person.id); onDeleted(); };
    return <ConfirmDelete label={t('Delete contact {{name}}', { name: personName(person) })} onDelete={remove} />;
});

// On the page of a contact: the button for a contact that only a mailbox created, the reasons otherwise.
export const PersonRemovalPanel = memo(({ person, onDeleted }: DeleteProps) => {
    const { t } = useTranslation();
    const { removal } = person;
    if (!removal) return null;
    return <Panel><h2>{t('Delete contact')}</h2>
        {removal.allowed
            ? <><p className={cls.muted}>{t('This contact was created from an email and is not tied to Weeztix, purchases or events. Its letters stay in the mailbox, and new letters from this address will not create the contact again.')}</p><div><DeleteContactButton person={person} onDeleted={onDeleted} /></div></>
            : <><p>{t('This contact cannot be deleted:')}</p><ul>{removal.blockers.map(blocker => <li key={blocker}>{t(`Removal blocker: ${blocker}`)}</li>)}</ul></>}
    </Panel>;
});
