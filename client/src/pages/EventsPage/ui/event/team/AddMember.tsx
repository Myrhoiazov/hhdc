import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addTeamMember } from '@/entities/EventTeam';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './EventTeam.module.scss';
import { ROLE_HINTS_ID } from '../../../model/teamRoles';
import { PersonFields } from './PersonFields';
import { readMember } from '../../../model/teamForm';

export const AddMember = memo(
    ({
        eventId,
        seesMoney,
        onSaved,
    }: {
        eventId: string;
        seesMoney: boolean;
        onSaved: () => void;
    }) => {
        const { t } = useTranslation();
        // A saved member empties the form, the contact search included.
        const [formKey, setFormKey] = useState(0);
        const action = useAction(onSaved);
        const submit = async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const element = event.currentTarget;
            if (await action.run(() => addTeamMember(eventId, readMember(new FormData(element))))) {
                element.reset();
                setFormKey((key) => key + 1);
            }
        };
        return (
            <form
                className={own.form}
                onSubmit={(event) => void submit(event)}
                aria-label={t('Add a team member')}
            >
                <div className={own.intro}>
                    <h3>{t('Add a team member')}</h3>
                    <p className={cls.muted}>
                        {t(
                            'Somebody who works on the event: an administrator, a videographer, a partner who supplies equipment. One person can hold several roles, each with its own pay. A contact who is neither staff nor a partner yet gets the role chosen here.'
                        )}
                    </p>
                </div>
                <div className={own.fields}>
                    <PersonFields key={formKey} />
                    <Field label="Role on the event">
                        <input name="roleTitle" list={ROLE_HINTS_ID} maxLength={120} required />
                    </Field>
                    {seesMoney && (
                        <Field label="Pay, if agreed">
                            <input name="amount" inputMode="decimal" autoComplete="off" />
                        </Field>
                    )}
                    <div className={own.whole}>
                        <Field label="What they do on the event">
                            <textarea name="duties" rows={2} maxLength={2000} />
                        </Field>
                    </div>
                </div>
                {action.error && (
                    <p role="alert" className={cls.error}>
                        {action.error}
                    </p>
                )}
                <div className={cls.actions}>
                    <Button type="submit" disabled={action.busy}>
                        {t('Add to the team')}
                    </Button>
                </div>
            </form>
        );
    }
);
