import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Panel } from '@/shared/ui/Panel';
import { PROVIDER_FORMS, providerFormFor } from '../model/providerForms';
import { Field } from '@/shared/ui/Field';
import { ProviderForm } from './ProviderForm';

export const ConnectPanel = memo(({ onSaved }: { onSaved: () => void }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState(PROVIDER_FORMS[0].provider);
    const definition = providerFormFor(selected) ?? PROVIDER_FORMS[0];
    return (
        <Panel>
            <h2>{t('Connect a provider')}</h2>
            <Field label="Provider">
                <select value={selected} onChange={(event) => setSelected(event.target.value)}>
                    {PROVIDER_FORMS.map((form) => (
                        <option key={form.provider} value={form.provider}>
                            {t(form.label)}
                        </option>
                    ))}
                </select>
            </Field>
            <ProviderForm key={definition.provider} definition={definition} onSaved={onSaved} />
        </Panel>
    );
});
