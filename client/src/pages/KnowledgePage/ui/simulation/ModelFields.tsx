import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PromptVersion } from '@/entities/Prompt';
import { ProviderConnection } from '@/entities/Provider';
import { Field } from '@/shared/ui/Field';

export const PromptSelect = memo(
    ({ label, name, prompts }: { label: string; name: string; prompts: PromptVersion[] }) => {
        const { t } = useTranslation();
        return (
            <Field label={label}>
                <select name={name} defaultValue="">
                    <option value="">{t('Active version')}</option>
                    {prompts.map((prompt) => (
                        <option
                            key={prompt.id}
                            value={prompt.id}
                        >{`v${prompt.version} · ${prompt.purpose} (${t(prompt.status)})`}</option>
                    ))}
                </select>
            </Field>
        );
    }
);

// The provider and the model the run is sent to. Left on "default", the first connected provider
// answers with the model saved on it, exactly as real emails do.
export const ModelFields = memo(({ providers }: { providers: ProviderConnection[] }) => {
    const { t } = useTranslation();
    const [providerId, setProviderId] = useState('');
    const selected = providers.find((provider) => provider.id === providerId) ?? providers[0];
    return (
        <>
            <Field label="AI provider">
                <select
                    name="providerConnectionId"
                    value={providerId}
                    onChange={(event) => setProviderId(event.target.value)}
                >
                    <option value="">{t('Default provider')}</option>
                    {providers.map((provider) => (
                        <option
                            key={provider.id}
                            value={provider.id}
                        >{`${provider.name} (${provider.provider})`}</option>
                    ))}
                </select>
            </Field>
            <Field label="Model">
                <input
                    name="model"
                    maxLength={200}
                    placeholder={String(selected?.settings.model ?? '')}
                />
            </Field>
        </>
    );
});
