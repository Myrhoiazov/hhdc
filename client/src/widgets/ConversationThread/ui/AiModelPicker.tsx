import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { DraftModelChoice } from '@/entities/Conversation';
import { PromptVersion } from '@/entities/Prompt';
import { ProviderConnection } from '@/entities/Provider';
import cls from './ConversationThread.module.scss';
import layout from '@/shared/ui/layout/layout.module.scss';

// For testing only: sends this one draft to another connected provider or model, or writes it
// with a saved prompt version that is not active. Real replies use the model saved on the
// provider in Settings and the active prompt.
export const AiModelPicker = memo(
    ({
        providers,
        prompts,
        choice,
        onChange,
    }: {
        providers: ProviderConnection[];
        prompts: PromptVersion[];
        choice: DraftModelChoice;
        onChange: (choice: DraftModelChoice) => void;
    }) => {
        const { t } = useTranslation();
        const selected =
            providers.find((provider) => provider.id === choice.providerConnectionId) ??
            providers[0];
        return (
            <div className={cls.modelPicker}>
                <label>
                    <span>{t('AI model for this reply (testing)')}</span>
                    <select
                        className={cls.modelControl}
                        value={choice.providerConnectionId ?? ''}
                        onChange={(event) =>
                            onChange({
                                ...choice,
                                providerConnectionId: event.target.value || undefined,
                            })
                        }
                    >
                        <option value="">{t('Default provider')}</option>
                        {providers.map((provider) => (
                            <option
                                key={provider.id}
                                value={provider.id}
                            >{`${provider.name} (${provider.provider})`}</option>
                        ))}
                    </select>
                </label>
                <label>
                    <span className={layout.srOnly}>{t('Model')}</span>
                    <input
                        className={cls.modelControl}
                        value={choice.model ?? ''}
                        maxLength={200}
                        placeholder={String(selected?.settings.model ?? '')}
                        onChange={(event) =>
                            onChange({ ...choice, model: event.target.value.trim() || undefined })
                        }
                    />
                </label>
                {prompts.length > 0 && (
                    <label>
                        <span>{t('Reply prompt')}</span>
                        <select
                            className={cls.modelControl}
                            value={choice.draftPromptId ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...choice,
                                    draftPromptId: event.target.value || undefined,
                                })
                            }
                        >
                            <option value="">{t('Active version')}</option>
                            {prompts.map((prompt) => (
                                <option
                                    key={prompt.id}
                                    value={prompt.id}
                                >{`v${prompt.version} · ${prompt.purpose} (${t(prompt.status)})`}</option>
                            ))}
                        </select>
                    </label>
                )}
            </div>
        );
    }
);
