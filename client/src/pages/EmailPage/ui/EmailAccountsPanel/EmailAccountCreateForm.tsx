import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card/Card';
import { CheckBox } from '@/shared/ui/CheckBox';
import { Input } from '@/shared/ui/Input/Input';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import type { CreateEmailAccountPayload } from '@/entities/EmailAccount';
import cls from './EmailAccountsPanel.module.scss';

interface EmailAccountCreateFormProps {
    form: CreateEmailAccountPayload;
    error: string | undefined;
    isSaving: boolean;
    setField: <Key extends keyof CreateEmailAccountPayload>(field: Key) => (value: string) => void;
    setSecure: (field: 'imapSecure' | 'smtpSecure') => (value: boolean) => void;
    onSubmit: () => Promise<void>;
}

export const EmailAccountCreateForm = memo((props: EmailAccountCreateFormProps) => {
    const { t } = useTranslation();
    const { form, error, isSaving, setField, setSecure, onSubmit } = props;

    return (
        <Card padding="24" fullWidth>
            <VStack gap="16" max>
                <Text title={t('Добавить IMAP-аккаунт')} size="s" bold className={cls.sectionTitle} />
                <EmailAccountConnectionFields form={form} setField={setField} />
                <Input label={t('Пароль / app-password')} type="password" value={form.password} onChange={setField('password')} fullWidth />
                <HStack gap="24">
                    <CheckBox value={form.imapSecure} onChange={setSecure('imapSecure')} label={t('TLS (SSL) для IMAP — обычно да, порт 993')} />
                    <CheckBox value={form.smtpSecure} onChange={setSecure('smtpSecure')} label={t('TLS (SSL) для SMTP — обычно да, порт 465')} />
                </HStack>
                {error && <Text text={error} variant="error" size="s" />}
                <HStack>
                    <Button theme={ButtonTheme.BACKGROUND_INVERTED} disabled={isSaving} onClick={onSubmit}>
                        {isSaving ? 'Проверка подключения...' : 'Добавить аккаунт'}
                    </Button>
                </HStack>
            </VStack>
        </Card>
    );
});

interface EmailAccountConnectionFieldsProps {
    form: CreateEmailAccountPayload;
    setField: EmailAccountCreateFormProps['setField'];
}

const EmailAccountConnectionFields = ({ form, setField }: EmailAccountConnectionFieldsProps) => {
    const { t } = useTranslation();

    return (
        <div className={cls.formGrid}>
            <Input label={t('Метка (для себя)')} placeholder="info@ddc.nl" value={form.label} onChange={setField('label')} fullWidth />
            <Input label="IMAP host" placeholder="mail.example.com" value={form.imapHost} onChange={setField('imapHost')} fullWidth />
            <Input label={t('Порт (IMAP)')} value={String(form.imapPort)} onChange={setField('imapPort')} fullWidth />
            <Input label={t('Пользователь')} placeholder="you@example.com" value={form.username} onChange={setField('username')} fullWidth />
            <Input label="SMTP host" placeholder="mail.example.com" value={form.smtpHost} onChange={setField('smtpHost')} fullWidth />
            <Input label={t('Порт (SMTP)')} value={String(form.smtpPort)} onChange={setField('smtpPort')} fullWidth />
            <Input label={t('Папка корзины')} placeholder="Trash" value={form.trashFolder ?? ''} onChange={setField('trashFolder')} fullWidth />
            <Input label={t('Папка спама')} placeholder="Junk" value={form.spamFolder ?? ''} onChange={setField('spamFolder')} fullWidth />
        </div>
    );
};
