import { FormEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { createAutomation, getAutomationMeta } from '@/entities/Automation';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { readAutomation } from '../model/readAutomation';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';

const DEFAULT_CONDITIONS = '{"all": []}';

const DEFAULT_CONFIG = '{"title": "Follow up"}';

export const AutomationForm = memo(({ refresh }: { refresh: () => void }) => {
    const { t } = useTranslation();
    const meta = useResource(getAutomationMeta);
    const action = useAction(refresh);
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        // Read inside the action, so conditions that are not JSON are shown as its error.
        void action.run(() => createAutomation(readAutomation(form)));
    };
    return (
        <Panel as="form" onSubmit={submit}>
            <h2>{t('Create automation')}</h2>
            <div className={cls.grid}>
                <Field label="Name">
                    <input name="name" required />
                </Field>
                <Field label="Trigger">
                    <select name="triggerType">
                        {meta.data?.triggers.map((item) => (
                            <option key={item} value={item}>
                                {t(item)}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Action">
                    <select name="actionType" defaultValue="CREATE_TASK">
                        {meta.data?.actions.map((item) => (
                            <option key={item} value={item}>
                                {t(item)}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>
            <Field label="Conditions (JSON)">
                <textarea name="conditions" rows={3} defaultValue={DEFAULT_CONDITIONS} required />
            </Field>
            <Field label="Action config (JSON)">
                <textarea name="config" rows={3} defaultValue={DEFAULT_CONFIG} required />
            </Field>
            <p className={cls.muted}>
                {t('New automations start as drafts. Test them before activating.')}
            </p>
            <RequestState error={action.error || meta.error} loading={false} />
            <Button type="submit" disabled={action.busy}>
                {t('Save')}
            </Button>
        </Panel>
    );
});
