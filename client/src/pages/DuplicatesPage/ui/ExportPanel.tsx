import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { createExport } from '@/entities/DataExport';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import { saveFile } from '@/shared/lib/download/saveFile';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';

const EXPORTS = ['people', 'participants', 'registrations', 'orders', 'tickets', 'finance'];

export const ExportPanel = memo(() => {
    const { t } = useTranslation();
    const action = useAction();
    const download = (entity: string) =>
        void action.run(async () => {
            const file = await createExport(entity);
            saveFile(file.filename, file.csv, 'text/csv;charset=utf-8');
        });
    return (
        <Panel>
            <h2>{t('Export')}</h2>
            <p className={cls.muted}>{t('Every export is recorded in the audit log.')}</p>
            <div className={cls.actions}>
                {EXPORTS.map((entity) => (
                    <Button key={entity} disabled={action.busy} onClick={() => download(entity)}>
                        {t(entity)}
                    </Button>
                ))}
            </div>
            <RequestState error={action.error} loading={false} />
        </Panel>
    );
});
