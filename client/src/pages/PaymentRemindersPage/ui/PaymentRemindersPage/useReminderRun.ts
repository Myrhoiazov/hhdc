import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';

export interface RunResult {
    sent: number;
    skipped: number;
    failed: number;
    alreadyQueued: number;
}

export const useReminderRun = (reloadDeliveries: () => void) => {
    const [isRunning, setIsRunning] = useState(false);
    const [runResult, setRunResult] = useState<RunResult>();

    const onRunNow = useCallback(async () => {
        if (!window.confirm('Запустить рассылку напоминаний прямо сейчас?')) {
            return;
        }
        setIsRunning(true);
        try {
            const { data } = await $apiPrivate.post<RunResult>('/payment-reminders/run');
            setRunResult(data);
            toast.success(`Готово: отправлено ${data.sent}, пропущено ${data.skipped}, ошибок ${data.failed}`);
            reloadDeliveries();
        } catch {
            toast.error('Не удалось запустить рассылку');
        } finally {
            setIsRunning(false);
        }
    }, [reloadDeliveries]);

    return { isRunning, runResult, onRunNow };
};
