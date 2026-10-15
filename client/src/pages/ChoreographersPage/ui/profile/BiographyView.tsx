import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChoreographerDetail } from '@/entities/Choreographer';
import { Panel } from '@/shared/ui/Panel';
import own from '../Choreographers.module.scss';

const ExternalLink = memo(({ url }: { url: string | null }) =>
    url ? (
        <a href={url} target="_blank" rel="noreferrer noopener">
            {url}
        </a>
    ) : (
        <>—</>
    )
);

export const BiographyView = memo(({ detail }: { detail: ChoreographerDetail }) => {
    const { t } = useTranslation();
    const { profile } = detail;
    return (
        <Panel aria-label={t('Biography')}>
            <h2>{t('Biography')}</h2>
            <p className={own.bio}>
                {profile.bioFull || profile.bioShort || t('No biography yet.')}
            </p>
            <dl className={own.definition}>
                <dt>{t('Time zone')}</dt>
                <dd>{profile.timezone ?? '—'}</dd>
                <dt>{t('Instagram')}</dt>
                <dd>
                    <ExternalLink url={profile.instagramUrl} />
                </dd>
                <dt>{t('TikTok')}</dt>
                <dd>
                    <ExternalLink url={profile.tiktokUrl} />
                </dd>
                <dt>{t('YouTube')}</dt>
                <dd>
                    <ExternalLink url={profile.youtubeUrl} />
                </dd>
                <dt>{t('Website')}</dt>
                <dd>
                    <ExternalLink url={profile.websiteUrl} />
                </dd>
            </dl>
        </Panel>
    );
});
