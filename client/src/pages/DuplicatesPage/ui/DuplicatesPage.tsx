import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { listDuplicates, scanDuplicates } from '@/entities/Duplicate';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import { DuplicateRow } from './DuplicateRow';
import { ExportPanel } from './ExportPanel';

export const DuplicatesPage = memo(() => {
    const { t } = useTranslation();
    const duplicates = useResource(listDuplicates);
    const refresh = useCallback(() => {
        void duplicates.refresh();
    }, [duplicates]);
    const scan = useAction(refresh);
    return (
        <CrmLayout title="Duplicates">
            <RequestState error={duplicates.error || scan.error} loading={duplicates.loading} />
            <Panel>
                <Button disabled={scan.busy} onClick={() => void scan.run(scanDuplicates)}>
                    {t('Scan for duplicates')}
                </Button>
                {duplicates.data?.total === 0 && <p>{t('No pending duplicate suggestions')}</p>}
                {duplicates.data?.data.map((item) => (
                    <DuplicateRow key={item.id} candidate={item} refresh={refresh} />
                ))}
            </Panel>
            <ExportPanel />
        </CrmLayout>
    );
});
