import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Campaign, CampaignPreview, previewCampaign, sendCampaign } from '@/entities/Campaign';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import cls from '@/shared/ui/layout/layout.module.scss';

const PreviewSummary = memo(({ preview }: { preview: CampaignPreview }) => {
    const { t } = useTranslation();
    return (
        <div className={cls.result}>
            <p>
                <strong>
                    {t('Recipients')}: {preview.recipients}
                </strong>
            </p>
            <p>
                {Object.entries(preview.byLanguage)
                    .map(([language, count]) => `${language}: ${count}`)
                    .join(' · ')}
            </p>
            <p className={cls.muted}>
                {t('No consent')}: {preview.excluded.noConsent} {t('excluded')} ·{' '}
                {t('Missing email')}: {preview.excluded.missingEmail} {t('excluded')}
            </p>
        </div>
    );
});

export const CampaignRow = memo(
    ({ campaign, refresh }: { campaign: Campaign; refresh: () => void }) => {
        const { t } = useTranslation();
        const [preview, setPreview] = useState<CampaignPreview>();
        const action = useAction();
        const send = () => {
            if (!preview || !window.confirm(`${t('Send this campaign to')} ${preview.recipients}?`))
                return;
            void action.run(async () => {
                await sendCampaign(campaign.id, preview.recipients);
                refresh();
            });
        };
        return (
            <div>
                <div className={cls.row}>
                    <strong>{campaign.name}</strong>
                    <span>{campaign.segment?.name}</span>
                    <StatusBadge status={campaign.status} />
                    <div className={cls.actions}>
                        <Button
                            disabled={action.busy}
                            onClick={() =>
                                void action.run(async () =>
                                    setPreview(await previewCampaign(campaign.id))
                                )
                            }
                        >
                            {t('Preview recipients')}
                        </Button>
                        <Button disabled={action.busy || !preview?.recipients} onClick={send}>
                            {t('Send')}
                        </Button>
                    </div>
                </div>
                {preview && <PreviewSummary preview={preview} />}
                <RequestState error={action.error} loading={false} />
            </div>
        );
    }
);
