import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    importWeeztixContacts,
    previewWeeztixContacts,
    syncWeeztixCatalog,
    syncWeeztixSales,
    WeeztixContactsResult,
} from '@/entities/Provider';
import { useAction } from '@/shared/lib/useResource/useAction';

// A record Weeztix returned but the CRM could not read counts as failed: it was not saved.
const withUnreadable = <Result extends { failed: number; unreadable: number }>(
    result: Result
): Result => ({ ...result, failed: result.failed + result.unreadable });

// Contacts are imported in two steps: the check shows what would happen and writes nothing,
// the import is offered only after it.
export const useWeeztixData = (connectionId: string) => {
    const { t } = useTranslation();
    const [notice, setNotice] = useState('');
    const [preview, setPreview] = useState<WeeztixContactsResult>();
    const action = useAction();
    // Counts finished actions, so the history knows when to be read again.
    const [runs, setRuns] = useState(0);
    const run = (work: () => Promise<string>) => {
        setNotice('');
        void action.run(async () => {
            try {
                setNotice(await work());
            } finally {
                setRuns((count) => count + 1);
            }
        });
    };
    return {
        notice,
        runs,
        preview,
        busy: action.busy,
        error: action.error,
        syncCatalog: () =>
            run(async () =>
                t(
                    'Events: {{events}} (new: {{created}}, updated: {{updated}}), ticket types: {{ticketTypes}}, failed: {{failed}}',
                    { ...withUnreadable(await syncWeeztixCatalog(connectionId)) }
                )
            ),
        syncSales: () =>
            run(async () => {
                const { sales } = await syncWeeztixSales(connectionId);
                const summary = t(
                    'Orders: {{orders}} (new: {{created}}, updated: {{updated}}), tickets: {{tickets}}, new registrations: {{registrations}}, new people: {{newPeople}}, failed: {{failed}}',
                    { ...withUnreadable(sales) }
                );
                return sales.firstError
                    ? `${summary}. ${t('First error: {{error}}', { error: sales.firstError })}`
                    : summary;
            }),
        checkContacts: () =>
            run(async () => {
                setPreview(await previewWeeztixContacts(connectionId));
                return '';
            }),
        importContacts: () =>
            run(async () => {
                const result = await importWeeztixContacts(connectionId);
                setPreview(undefined);
                return t(
                    'Contacts imported. New people: {{created}}, matched by email: {{linked}}, failed: {{failed}}',
                    { ...result }
                );
            }),
    };
};
