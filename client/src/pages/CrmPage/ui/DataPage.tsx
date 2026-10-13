import { memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Campaign, CampaignPreview, listCampaigns, previewCampaign, sendCampaign } from '@/entities/Campaign';
import { createExport } from '@/entities/DataExport';
import { DuplicateCandidate, listDuplicates, mergePeople, resolveDuplicate, scanDuplicates } from '@/entities/Duplicate';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Badge } from '@/shared/ui/Badge';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';

const EXPORTS = ['people', 'participants', 'registrations', 'orders', 'tickets', 'finance'];

const saveCsv = (filename: string, csv: string) => {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

const DuplicateRow = memo(({ candidate, refresh }: { candidate: DuplicateCandidate; refresh: () => void }) => {
    const { t } = useTranslation();
    const action = useAction(refresh);
    const { personA, personB } = candidate;
    if (!personA || !personB) return null;
    // Merging is always an explicit human decision: the first person is kept, the second archived.
    const merge = () => {
        if (!window.confirm(t('Merge these two people? The second record will be archived.'))) return;
        void action.run(() => mergePeople(personA.id, personB.id));
    };
    return <div>
        <div className={cls.row}>
            <span><Link to={`/people/${personA.id}`}>{personA.displayName}</Link> · {personA.email || personA.phone}</span>
            <span><Link to={`/people/${personB.id}`}>{personB.displayName}</Link> · {personB.email || personB.phone}</span>
            <Badge>{`${Math.round(candidate.score * 100)}% · ${candidate.reasons.map(reason => t(reason)).join(', ')}`}</Badge>
            <div className={cls.actions}>
                <Button disabled={action.busy} onClick={merge}>{t('Merge')}</Button>
                <Button disabled={action.busy} onClick={() => void action.run(() => resolveDuplicate(candidate.id, 'NOT_DUPLICATE'))}>{t('Not a duplicate')}</Button>
            </div>
        </div>
        <RequestState error={action.error} loading={false} />
    </div>;
});

const ExportPanel = memo(() => {
    const { t } = useTranslation();
    const action = useAction();
    const download = (entity: string) => void action.run(async () => { const file = await createExport(entity); saveCsv(file.filename, file.csv); });
    return <Panel>
        <h2>{t('Export')}</h2>
        <p className={cls.muted}>{t('Every export is recorded in the audit log.')}</p>
        <div className={cls.actions}>{EXPORTS.map(entity => <Button key={entity} disabled={action.busy} onClick={() => download(entity)}>{t(entity)}</Button>)}</div>
        <RequestState error={action.error} loading={false} />
    </Panel>;
});

export const DuplicatesPage = memo(() => {
    const { t } = useTranslation();
    const duplicates = useResource(listDuplicates);
    const refresh = useCallback(() => { void duplicates.refresh(); }, [duplicates]);
    const scan = useAction(refresh);
    return <CrmLayout title="Duplicates">
        <RequestState error={duplicates.error || scan.error} loading={duplicates.loading} />
        <Panel>
            <Button disabled={scan.busy} onClick={() => void scan.run(scanDuplicates)}>{t('Scan for duplicates')}</Button>
            {duplicates.data?.total === 0 && <p>{t('No pending duplicate suggestions')}</p>}
            {duplicates.data?.data.map(item => <DuplicateRow key={item.id} candidate={item} refresh={refresh} />)}
        </Panel>
        <ExportPanel />
    </CrmLayout>;
});

const PreviewSummary = memo(({ preview }: { preview: CampaignPreview }) => {
    const { t } = useTranslation();
    return <div className={cls.result}>
        <p><strong>{t('Recipients')}: {preview.recipients}</strong></p>
        <p>{Object.entries(preview.byLanguage).map(([language, count]) => `${language}: ${count}`).join(' · ')}</p>
        <p className={cls.muted}>{t('No consent')}: {preview.excluded.noConsent} {t('excluded')} · {t('Missing email')}: {preview.excluded.missingEmail} {t('excluded')}</p>
    </div>;
});

const CampaignRow = memo(({ campaign, refresh }: { campaign: Campaign; refresh: () => void }) => {
    const { t } = useTranslation();
    const [preview, setPreview] = useState<CampaignPreview>();
    const action = useAction();
    const send = () => {
        if (!preview || !window.confirm(`${t('Send this campaign to')} ${preview.recipients}?`)) return;
        void action.run(async () => { await sendCampaign(campaign.id, preview.recipients); refresh(); });
    };
    return <div>
        <div className={cls.row}>
            <strong>{campaign.name}</strong>
            <span>{campaign.segment?.name}</span>
            <StatusBadge status={campaign.status} />
            <div className={cls.actions}>
                <Button disabled={action.busy} onClick={() => void action.run(async () => setPreview(await previewCampaign(campaign.id)))}>{t('Preview recipients')}</Button>
                <Button disabled={action.busy || !preview?.recipients} onClick={send}>{t('Send')}</Button>
            </div>
        </div>
        {preview && <PreviewSummary preview={preview} />}
        <RequestState error={action.error} loading={false} />
    </div>;
});

export const CampaignsPage = memo(() => {
    const { t } = useTranslation();
    const campaigns = useResource(listCampaigns);
    const refresh = useCallback(() => { void campaigns.refresh(); }, [campaigns]);
    return <CrmLayout title="Campaigns">
        <RequestState error={campaigns.error} loading={campaigns.loading} />
        <Panel>
            <p className={cls.muted}>{t('Only people with an active marketing-email consent receive campaigns.')}</p>
            {campaigns.data?.total === 0 && <p>{t('No campaigns yet')}</p>}
            {campaigns.data?.data.map(item => <CampaignRow key={item.id} campaign={item} refresh={refresh} />)}
        </Panel>
    </CrmLayout>;
});
