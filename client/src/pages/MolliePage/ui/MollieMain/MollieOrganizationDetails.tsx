import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { OrganizationProfile } from './useMollieOrganizations';
import s from './MollieMain.module.scss';

interface MollieOrganizationDetailsProps {
    org: OrganizationProfile;
}

export const MollieOrganizationDetails = memo(({ org }: MollieOrganizationDetailsProps) => {
    const { t } = useTranslation('home');

    return (
        <div className={s.detailsGrid}>
            <div className={s.detailItem}>
                <span className={s.label}>{t('Email')}</span>
                <span className={s.value}>{org.email || '—'}</span>
            </div>
            <div className={s.detailItem}>
                <span className={s.label}>{t('Phone')}</span>
                <span className={s.value}>{org.phone || '—'}</span>
            </div>
            <div className={s.detailItem}>
                <span className={s.label}>{t('Mode')}</span>
                <span className={s.value}>{org.mode}</span>
            </div>
            <div className={s.detailItem}>
                <span className={s.label}>{t('Business category')}</span>
                <span className={s.value}>{org.businessCategory || '—'}</span>
            </div>
            <div className={s.detailItem}>
                <span className={s.label}>{t('Category code')}</span>
                <span className={s.value}>{org.categoryCode || '—'}</span>
            </div>
            <div className={s.detailItem}>
                <span className={s.label}>{t('Countries')}</span>
                <span className={s.value}>{org.countriesOfActivity?.join(', ') || '—'}</span>
            </div>
            <div className={s.detailItem}>
                <span className={s.label}>{t('Created')}</span>
                <span className={s.value}>{new Date(org.createdAt).toLocaleDateString('nl-NL')}</span>
            </div>
            <div className={s.detailItem}>
                <span className={s.label}>{t('Website')}</span>
                <span className={s.value}>{org.website || '—'}</span>
            </div>
        </div>
    );
});