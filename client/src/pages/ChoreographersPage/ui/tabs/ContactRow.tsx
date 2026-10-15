import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChoreographerContact } from '@/entities/Choreographer';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from '../Choreographers.module.scss';

interface ContactRowProps {
    contact: ChoreographerContact;
    canManage: boolean;
    onMakePrimary: (contact: ChoreographerContact) => void;
    onDeactivate: (contact: ChoreographerContact) => void;
}

export const ContactRow = memo(
    ({ contact, canManage, onMakePrimary, onDeactivate }: ContactRowProps) => {
        const { t } = useTranslation();
        return (
            <div className={own.listRow}>
                <span>
                    <strong>{contact.name || contact.email || contact.phone}</strong>
                    <div className={own.secondary}>
                        {[t(contact.kind), contact.organization].filter(Boolean).join(' · ')}
                    </div>
                </span>
                <span className={own.secondary}>
                    {[contact.email, contact.phone].filter(Boolean).join(' · ')}
                    {contact.notes && <div>{contact.notes}</div>}
                </span>
                <span className={own.chips}>
                    {contact.isPrimary && <span className={own.chip}>{t('Primary')}</span>}
                    <StatusBadge status={contact.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </span>
                {canManage && contact.isActive && (
                    <span className={cls.actions}>
                        {!contact.isPrimary && (
                            <Button onClick={() => onMakePrimary(contact)}>
                                {t('Make primary')}
                            </Button>
                        )}
                        <Button onClick={() => onDeactivate(contact)}>{t('Deactivate')}</Button>
                    </span>
                )}
            </div>
        );
    }
);
