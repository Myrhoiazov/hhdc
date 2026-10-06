import { memo } from 'react';
import { Page } from '@/widgets/Page/Page';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import { usePaymentReminders } from './usePaymentReminders';
import { PaymentReminderSettingsCard } from './PaymentReminderSettingsCard';
import { PaymentReminderTemplateCard } from './PaymentReminderTemplateCard';
import { PaymentReminderDeliveriesCard } from './PaymentReminderDeliveriesCard';
import s from './PaymentRemindersPage.module.scss';

const PaymentRemindersHeader = () => (
    <div>
        <Text title="Напоминания об оплате" size="l" bold />
        <Text text="Автоматическая рассылка клиентам о предстоящем списании по подписке." size="s" className={s.subtitle} />
    </div>
);

const PaymentRemindersPage = memo(() => {
    const {
        settings, setSettings, emailAccountOptions, isSettingsLoading, isSettingsSaving,
        setTemplates, placeholders, activeLanguage, setActiveLanguage, activeTemplate,
        isTemplatesLoading, isTemplateSaving, testEmail, setTestEmail, isSendingTest,
        isRunning, runResult, deliveries, deliveriesStatusFilter, setDeliveriesStatusFilter,
        isDeliveriesLoading, onSaveSettings, onSaveTemplate, onSendTest, onRunNow,
    } = usePaymentReminders();

    return (
        <Page>
            <VStack max gap="24" className={s.page}>
                <PaymentRemindersHeader />

                <PaymentReminderSettingsCard
                    isLoading={isSettingsLoading} settings={settings} setSettings={setSettings}
                    emailAccountOptions={emailAccountOptions} isSaving={isSettingsSaving}
                    isRunning={isRunning} runResult={runResult}
                    onSaveSettings={onSaveSettings} onRunNow={onRunNow}
                />

                <PaymentReminderTemplateCard
                    isLoading={isTemplatesLoading} activeLanguage={activeLanguage} setActiveLanguage={setActiveLanguage}
                    activeTemplate={activeTemplate} setTemplates={setTemplates} placeholders={placeholders}
                    isSaving={isTemplateSaving} onSaveTemplate={onSaveTemplate}
                    testEmail={testEmail} setTestEmail={setTestEmail}
                    isSendingTest={isSendingTest} onSendTest={onSendTest}
                />

                <PaymentReminderDeliveriesCard
                    isLoading={isDeliveriesLoading} deliveries={deliveries}
                    statusFilter={deliveriesStatusFilter} onStatusFilterChange={setDeliveriesStatusFilter}
                />
            </VStack>
        </Page>
    );
});

export default PaymentRemindersPage;
