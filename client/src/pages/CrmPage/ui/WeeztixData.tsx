import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { importWeeztixContacts, previewWeeztixContacts, syncWeeztixCatalog, syncWeeztixSales, WeeztixContactsResult } from '@/entities/crm';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import cls from './CrmPage.module.scss';

// A record Weeztix returned but the CRM could not read counts as failed: it was not saved.
const withUnreadable = <Result extends { failed: number; unreadable: number }>(result: Result): Result => ({ ...result, failed: result.failed + result.unreadable });

// Contacts are imported in two steps: the check shows what would happen and writes nothing,
// the import is offered only after it.
const useWeeztixData = (connectionId: string) => {
    const { t } = useTranslation();
    const [notice, setNotice] = useState('');
    const [preview, setPreview] = useState<WeeztixContactsResult>();
    const action = useAction();
    const run = (work: () => Promise<string>) => { setNotice(''); void action.run(async () => { setNotice(await work()); }); };
    return {
        notice,
        preview,
        busy: action.busy,
        error: action.error,
        syncCatalog: () => run(async () => t('Events: {{events}} (new: {{created}}, updated: {{updated}}), ticket types: {{ticketTypes}}, failed: {{failed}}', { ...withUnreadable(await syncWeeztixCatalog(connectionId)) })),
        syncSales: () => run(async () => {
            const { sales } = await syncWeeztixSales(connectionId);
            const summary = t('Orders: {{orders}} (new: {{created}}, updated: {{updated}}), tickets: {{tickets}}, new registrations: {{registrations}}, new people: {{newPeople}}, failed: {{failed}}', { ...withUnreadable(sales) });
            return sales.firstError ? `${summary}. ${t('First error: {{error}}', { error: sales.firstError })}` : summary;
        }),
        checkContacts: () => run(async () => { setPreview(await previewWeeztixContacts(connectionId)); return ''; }),
        importContacts: () => run(async () => {
            const result = await importWeeztixContacts(connectionId);
            setPreview(undefined);
            return t('Contacts imported. New people: {{created}}, matched by email: {{linked}}, failed: {{failed}}', { ...result });
        }),
    };
};

const ContactsPreview = memo(({ preview, busy, onImport }: { preview: WeeztixContactsResult; busy: boolean; onImport: () => void }) => {
    const { t } = useTranslation();
    const pending = preview.created + preview.linked;
    return <div aria-label={t('Check contacts')} role="group">
        <p>{t('Buyers in Weeztix: {{contacts}} (orders: {{orders}}). New people: {{created}}, matched to people already in the CRM by email: {{linked}}, already imported: {{known}}, skipped because several people share the email: {{ambiguous}}.', { ...preview })}</p>
        {pending > 0
            ? <div className={cls.actions}><Button disabled={busy} onClick={onImport}>{t('Import {{count}} contacts', { count: pending })}</Button></div>
            : <p className={cls.muted}>{t('Nothing new to import')}</p>}
    </div>;
});

export const WeeztixData = memo(({ connectionId }: { connectionId: string }) => {
    const { t } = useTranslation();
    const data = useWeeztixData(connectionId);
    return <div aria-label={t('Data from Weeztix')} role="group">
        <h3>{t('Data from Weeztix')}</h3>
        <p className={cls.muted}>{t('New orders, events and prices are read from Weeztix automatically every few minutes. The buttons read them right now.')}</p>
        <div className={cls.actions}>
            <Button disabled={data.busy} onClick={data.syncCatalog}>{t('Sync events and prices')}</Button>
            <Button disabled={data.busy} onClick={data.syncSales}>{t('Sync orders and tickets')}</Button>
            <Button disabled={data.busy} onClick={data.checkContacts}>{t('Check contacts')}</Button>
        </div>
        {data.preview && <ContactsPreview preview={data.preview} busy={data.busy} onImport={data.importContacts} />}
        {data.busy && <p className={cls.muted}>{t('Reading Weeztix. A full sync takes up to a minute.')}</p>}
        {data.notice && <p role="status">{data.notice}</p>}
        {data.error && <p role="alert" className={cls.error}>{data.error}</p>}
    </div>;
});
