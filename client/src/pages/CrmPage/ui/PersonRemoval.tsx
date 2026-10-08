import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deletePerson, Person } from '@/entities/crm';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import cls from './CrmPage.module.scss';

const personName = (person: Person) => person.displayName || `${person.firstName} ${person.lastName}`.trim() || person.email || '';

interface DeleteProps { person: Person; onDeleted: () => void }

// Deleting cannot be undone, so the first press only asks and the second one deletes.
export const DeleteContactButton = memo(({ person, onDeleted }: DeleteProps) => {
    const { t } = useTranslation();
    const [asking, setAsking] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const name = personName(person);
    const remove = async () => {
        setBusy(true);
        try { await deletePerson(person.id); onDeleted(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Unable to delete')); setBusy(false); }
    };
    if (!asking) return <Button theme={ButtonTheme.OUTLINE_RED} aria-label={t('Delete contact {{name}}', { name })} onClick={() => setAsking(true)}>{t('Delete')}</Button>;
    return <span className={cls.actions}>
        <Button theme={ButtonTheme.OUTLINE_RED} disabled={busy} aria-label={t('Confirm deleting {{name}}', { name })} onClick={() => void remove()}>{t('Delete for good')}</Button>
        <Button disabled={busy} onClick={() => { setAsking(false); setError(''); }}>{t('Cancel')}</Button>
        {error && <span role="alert" className={cls.error}>{error}</span>}
    </span>;
});

// On the page of a contact: the button for a contact that only a mailbox created, the reasons otherwise.
export const PersonRemovalPanel = memo(({ person, onDeleted }: DeleteProps) => {
    const { t } = useTranslation();
    const { removal } = person;
    if (!removal) return null;
    return <section className={cls.panel}><h2>{t('Delete contact')}</h2>
        {removal.allowed
            ? <><p className={cls.muted}>{t('This contact was created from an email and is not tied to Weeztix, purchases or events. Its letters stay in the mailbox.')}</p><div><DeleteContactButton person={person} onDeleted={onDeleted} /></div></>
            : <><p>{t('This contact cannot be deleted:')}</p><ul>{removal.blockers.map(blocker => <li key={blocker}>{t(`Removal blocker: ${blocker}`)}</li>)}</ul></>}
    </section>;
});
