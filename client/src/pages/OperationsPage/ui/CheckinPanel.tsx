import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkIn, CheckinResult } from '@/entities/Operations';
import { listEvents } from '@/entities/Event';
import { formatTime } from '@/shared/lib/format/date';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { readCheckIn } from '../model/readCheckIn';
import { Field } from '@/shared/ui/Field';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';

const CheckinOutcome = memo(({ result, error }: { result?: CheckinResult; error: string }) => {
    const { t } = useTranslation();
    if (error)
        return (
            <div role="alert" className={classNames(cls.result, {}, [cls.danger])}>
                <strong>{error}</strong>
            </div>
        );
    if (!result) return null;
    return (
        <div role="status" className={classNames(cls.result, {}, [cls.success])}>
            <strong>{result.registration.person.displayName}</strong>
            <p>
                {result.registration.event.name}
                {result.registration.ticket ? ` · ${result.registration.ticket.ticketType}` : ''}
            </p>
            <p>
                {t('Checked in')} {formatTime(result.checkedInAt)}
            </p>
        </div>
    );
});

// Staff-only check-in: the scanned code is an opaque token or ticket barcode, never personal data.
export const CheckinPanel = memo(() => {
    const { t } = useTranslation();
    const events = useResource(listEvents);
    const [result, setResult] = useState<CheckinResult>();
    const action = useAction();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const { code, eventId } = readCheckIn(new FormData(form));
        setResult(undefined);
        void action.run(async () => {
            setResult(await checkIn(code, eventId));
            form.reset();
        });
    };
    return (
        <Panel as="form" onSubmit={submit}>
            <h2>{t('Check-in')}</h2>
            <div className={cls.grid}>
                <Field label="Event">
                    <select name="eventId">
                        <option value="">{t('Any event')}</option>
                        {events.data?.data.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Ticket code">
                    <input name="code" autoComplete="off" autoFocus required />
                </Field>
            </div>
            <Button type="submit" disabled={action.busy}>
                {t('Check in')}
            </Button>
            <CheckinOutcome result={result} error={action.error} />
        </Panel>
    );
});
