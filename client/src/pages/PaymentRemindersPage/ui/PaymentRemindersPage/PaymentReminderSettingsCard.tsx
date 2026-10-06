import { Dispatch, memo, SetStateAction } from 'react';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Input } from '@/shared/ui/Input/Input';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { CheckBox } from '@/shared/ui/CheckBox';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { ReminderSettings, RunResult } from './usePaymentReminders';
import s from './PaymentRemindersPage.module.scss';

const offsetOptions: SelectOption<string>[] = [
    { value: '3', content: 'За 3 дня' },
    { value: '7', content: 'За 1 неделю' },
];

interface PaymentReminderSettingsCardProps {
    isLoading: boolean;
    settings?: ReminderSettings;
    setSettings: Dispatch<SetStateAction<ReminderSettings | undefined>>;
    emailAccountOptions: SelectOption<string>[];
    isSaving: boolean;
    isRunning: boolean;
    runResult?: RunResult;
    onSaveSettings: () => void;
    onRunNow: () => void;
}

const SettingsFields = ({ settings, setSettings, emailAccountOptions }: {
    settings: ReminderSettings;
    setSettings: Dispatch<SetStateAction<ReminderSettings | undefined>>;
    emailAccountOptions: SelectOption<string>[];
}) => (
    <>
        <div className={s.grid}>
            <Select
                label="Отправлять"
                options={offsetOptions}
                value={String(settings.offsetDays)}
                onChange={(value) => setSettings({ ...settings, offsetDays: Number(value) as 3 | 7 })}
            />
            <Input
                fullWidth
                label="Час отправки (0-23)"
                type="number"
                value={settings.sendHour}
                onChange={(value) => setSettings({ ...settings, sendHour: Math.min(23, Math.max(0, Number(value) || 0)) })}
            />
            <Input
                fullWidth
                label="Минута отправки (0-59)"
                type="number"
                value={settings.sendMinute}
                onChange={(value) => setSettings({ ...settings, sendMinute: Math.min(59, Math.max(0, Number(value) || 0)) })}
            />
            <Select
                label="Ящик-отправитель"
                options={emailAccountOptions}
                value={settings.senderEmailAccountId ? String(settings.senderEmailAccountId) : ''}
                onChange={(value) => setSettings({ ...settings, senderEmailAccountId: value ? Number(value) : null })}
            />
        </div>
        <CheckBox label="Рассылка включена" value={settings.enabled} onChange={(checked) => setSettings({ ...settings, enabled: checked })} />
    </>
);

const SettingsActions = ({ isSaving, onSaveSettings, isRunning, onRunNow, runResult }: {
    isSaving: boolean;
    onSaveSettings: () => void;
    isRunning: boolean;
    onRunNow: () => void;
    runResult?: RunResult;
}) => (
    <>
        <HStack gap="8" wrap="wrap">
            <Button theme={ButtonTheme.BACKGROUND_INVERTED} disabled={isSaving} onClick={onSaveSettings}>
                {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
            </Button>
            <Button theme={ButtonTheme.OUTLINE} disabled={isRunning} onClick={onRunNow}>
                {isRunning ? 'Запуск...' : 'Запустить сейчас'}
            </Button>
        </HStack>
        {runResult && (
            <Text
                size="s"
                text={`Последний запуск: отправлено ${runResult.sent}, пропущено ${runResult.skipped}, ошибок ${runResult.failed}, уже в очереди ${runResult.alreadyQueued}`}
            />
        )}
    </>
);

export const PaymentReminderSettingsCard = memo((props: PaymentReminderSettingsCardProps) => {
    const { isLoading, settings, setSettings, emailAccountOptions, isSaving, isRunning, runResult, onSaveSettings, onRunNow } = props;

    return (
        <Card padding="24" fullWidth className={s.card}>
            <VStack max gap="16">
                <Text title="Настройки" size="m" bold />
                {isLoading && <Skeleton width="100%" height={160} border="12px" />}
                {!isLoading && settings && (
                    <>
                        <SettingsFields settings={settings} setSettings={setSettings} emailAccountOptions={emailAccountOptions} />
                        <SettingsActions
                            isSaving={isSaving}
                            onSaveSettings={onSaveSettings}
                            isRunning={isRunning}
                            onRunNow={onRunNow}
                            runResult={runResult}
                        />
                    </>
                )}
            </VStack>
        </Card>
    );
});
