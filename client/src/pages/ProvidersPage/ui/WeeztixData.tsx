import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { WeeztixContactsResult } from '@/entities/Provider';
import { Button } from '@/shared/ui/Button';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './WeeztixData.module.scss';
import { SyncHistory } from './SyncHistory';
import { useWeeztixData } from '../model/useWeeztixData';

const ContactsPreview = memo(
    ({
        preview,
        busy,
        onImport,
    }: {
        preview: WeeztixContactsResult;
        busy: boolean;
        onImport: () => void;
    }) => {
        const { t } = useTranslation();
        const pending = preview.created + preview.linked;
        return (
            <div aria-label={t('Check contacts')} role="group">
                <p>
                    {t(
                        'Buyers in Weeztix: {{contacts}} (orders: {{orders}}). New people: {{created}}, matched to people already in the CRM by email: {{linked}}, already imported: {{known}}, skipped because several people share the email: {{ambiguous}}.',
                        { ...preview }
                    )}
                </p>
                {pending > 0 ? (
                    <div className={cls.actions}>
                        <Button disabled={busy} onClick={onImport}>
                            {t('Import {{count}} contacts', { count: pending })}
                        </Button>
                    </div>
                ) : (
                    <p className={cls.muted}>{t('Nothing new to import')}</p>
                )}
            </div>
        );
    }
);

export const WeeztixData = memo(({ connectionId }: { connectionId: string }) => {
    const { t } = useTranslation();
    const data = useWeeztixData(connectionId);
    return (
        <div className={own.WeeztixData} aria-label={t('Data from Weeztix')} role="group">
            <div className={own.intro}>
                <h3>{t('Data from Weeztix')}</h3>
                <p className={cls.muted}>
                    {t(
                        'New orders, events and prices are read from Weeztix automatically every few minutes. The buttons read them right now.'
                    )}
                </p>
            </div>
            <div className={cls.actions}>
                <Button disabled={data.busy} onClick={data.syncCatalog}>
                    {t('Sync events and prices')}
                </Button>
                <Button disabled={data.busy} onClick={data.syncSales}>
                    {t('Sync orders and tickets')}
                </Button>
                <Button disabled={data.busy} onClick={data.checkContacts}>
                    {t('Check contacts')}
                </Button>
            </div>
            {data.preview && (
                <ContactsPreview
                    preview={data.preview}
                    busy={data.busy}
                    onImport={data.importContacts}
                />
            )}
            {data.busy && (
                <p className={cls.muted}>
                    {t('Reading Weeztix. A full sync takes up to a minute.')}
                </p>
            )}
            {data.notice && <p role="status">{data.notice}</p>}
            {data.error && (
                <p role="alert" className={cls.error}>
                    {data.error}
                </p>
            )}
            <SyncHistory connectionId={connectionId} version={data.runs} />
        </div>
    );
});
