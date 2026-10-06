import { useTranslation } from 'react-i18next';
import type { AiDraftProvider } from '../aiProviderSettingsTypes';
import s from './KnowledgeBasePage.module.scss';

export const AiProviderSettingsPanel = ({ provider, setProvider, model, setModel, busy, testing, error, save, test }: {
    provider: AiDraftProvider;
    setProvider: (value: AiDraftProvider) => void;
    model: string;
    setModel: (value: string) => void;
    busy: boolean;
    testing: boolean;
    error: string | null;
    save: () => void;
    test: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <section className={s.card}>
            <h2>{t('Провайдер генерации ответов')}</h2>
            <p>{t('Классификация, база знаний и проверка спама остаются локальными. Облачный провайдер используется только для текста финального ответа.')}</p>
            <div className={s.grid}>
                <label>{t('Провайдер')}
                    <select value={provider} onChange={(e) => setProvider(e.target.value as AiDraftProvider)}>
                        <option value="OLLAMA">{t('Ollama (локально)')}</option>
                        <option value="OPENAI">{t('OpenAI (облако)')}</option>
                    </select>
                </label>
                <label>{t('Модель')}<input value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini" /></label>
                <div className={s.providerActions}>
                    <button className={s.primary} disabled={busy || !model.trim()} onClick={save}>{t('Сохранить')}</button>
                    <button disabled={testing} onClick={test}>{testing ? t('Проверка…') : t('Проверить подключение')}</button>
                </div>
            </div>
            <p>{t('При недоступности выбранного провайдера письмо останется на ручной обработке. Автоматического переключения нет.')}</p>
            {error && <p role="alert" className={s.error}>{error}</p>}
        </section>
    );
};
