import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    addPersonRole,
    Person,
    PERSON_ROLES,
    PersonRole,
    removePersonRole,
} from '@/entities/Person';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { RequestState } from '@/shared/ui/RequestState';
import own from './PersonPage.module.scss';

export interface PersonProps {
    person: Person;
    onSaved: () => void;
}

// A role the contact has is a badge with a cross that takes it away: a role given by mistake is
// undone where it was given. A role it lacks is a dashed button that gives it.
const RoleBadge = memo(
    ({ role, onRemove }: { role: PersonRole; onRemove: (role: PersonRole) => void }) => {
        const { t } = useTranslation();
        return (
            <Badge className={own.role}>
                {t(role)}
                <button
                    type="button"
                    className={own.removeRole}
                    aria-label={t('Remove the role {{role}}', { role: t(role) })}
                    onClick={() => onRemove(role)}
                >
                    ×
                </button>
            </Badge>
        );
    }
);

export const PersonRoles = memo(({ person, onSaved }: PersonProps) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const has = (role: PersonRole) => person.roles.some((item) => item.role === role);
    const change = async (request: Promise<unknown>) => {
        setError('');
        try {
            await request;
            onSaved();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('Unable to save'));
        }
    };
    return (
        <div className={own.roles}>
            <h2 className={own.label}>{t('Roles')}</h2>
            {PERSON_ROLES.filter(has).map((role) => (
                <RoleBadge
                    key={role}
                    role={role}
                    onRemove={(removed) => void change(removePersonRole(person.id, removed))}
                />
            ))}
            {PERSON_ROLES.filter((role) => !has(role)).map((role) => (
                <Button
                    key={role}
                    className={own.addRole}
                    aria-label={t('Add the role {{role}}', { role: t(role) })}
                    onClick={() => void change(addPersonRole(person.id, role))}
                >{`+ ${t(role)}`}</Button>
            ))}
            <RequestState error={error} loading={false} />
        </div>
    );
});
