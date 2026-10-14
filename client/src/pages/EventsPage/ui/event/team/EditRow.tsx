import { FormEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { TeamMember, TeamMemberChange } from '@/entities/EventTeam';
import { formText } from '@/shared/lib/form/formText';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './EventTeam.module.scss';
import { ROLE_HINTS_ID } from '../../../model/teamRoles';

export interface FormRowProps {
    member: TeamMember;
    columns: number;
    busy: boolean;
    onCancel: () => void;
}

export const EditRow = memo(
    ({
        member,
        columns,
        busy,
        onCancel,
        onSave,
    }: FormRowProps & { onSave: (member: TeamMember, change: TeamMemberChange) => void }) => {
        const { t } = useTranslation();
        const title = t('Edit the role of {{name}}', { name: member.person.displayName });
        const submit = (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            onSave(member, {
                roleTitle: formText(form, 'roleTitle'),
                duties: formText(form, 'duties') || null,
                notes: formText(form, 'notes') || null,
            });
        };
        return (
            <tr>
                <td colSpan={columns}>
                    <form className={own.fields} onSubmit={submit} aria-label={title}>
                        <strong className={own.whole}>{title}</strong>
                        <Field label="Role on the event">
                            <input
                                name="roleTitle"
                                list={ROLE_HINTS_ID}
                                maxLength={120}
                                defaultValue={member.roleTitle}
                                required
                            />
                        </Field>
                        <div className={own.wide}>
                            <Field label="What they do on the event">
                                <textarea
                                    name="duties"
                                    rows={2}
                                    maxLength={2000}
                                    defaultValue={member.duties ?? ''}
                                />
                            </Field>
                        </div>
                        <div className={own.whole}>
                            <Field label="Notes">
                                <input
                                    name="notes"
                                    maxLength={2000}
                                    defaultValue={member.notes ?? ''}
                                />
                            </Field>
                        </div>
                        <div className={`${cls.actions} ${own.whole}`}>
                            <Button type="submit" disabled={busy}>
                                {t('Save')}
                            </Button>
                            <Button disabled={busy} onClick={onCancel}>
                                {t('Cancel')}
                            </Button>
                        </div>
                    </form>
                </td>
            </tr>
        );
    }
);
