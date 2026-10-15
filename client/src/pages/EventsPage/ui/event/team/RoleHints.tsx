import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ROLE_HINTS, ROLE_HINTS_ID } from '../../../model/teamRoles';

export const RoleHints = memo(() => {
    const { t } = useTranslation();
    return (
        <datalist id={ROLE_HINTS_ID}>
            {ROLE_HINTS.map((role) => (
                <option key={role} value={t(role)} />
            ))}
        </datalist>
    );
});
