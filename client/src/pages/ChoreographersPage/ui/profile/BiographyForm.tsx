import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ChoreographerDetail,
    RELATIONSHIP_STATUSES,
    updateChoreographer,
} from '@/entities/Choreographer';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { readProfileForm } from '../../model/readProfileForm';

const LinkFields = memo(({ detail }: { detail: ChoreographerDetail }) => (
    <>
        <Field label="Instagram">
            <input
                name="instagramUrl"
                type="url"
                defaultValue={detail.profile.instagramUrl ?? ''}
            />
        </Field>
        <Field label="TikTok">
            <input name="tiktokUrl" type="url" defaultValue={detail.profile.tiktokUrl ?? ''} />
        </Field>
        <Field label="YouTube">
            <input name="youtubeUrl" type="url" defaultValue={detail.profile.youtubeUrl ?? ''} />
        </Field>
        <Field label="Website">
            <input name="websiteUrl" type="url" defaultValue={detail.profile.websiteUrl ?? ''} />
        </Field>
    </>
));

export const BiographyForm = memo(
    ({ detail, onSaved }: { detail: ChoreographerDetail; onSaved: () => void }) => {
        const { t } = useTranslation();
        const { profile } = detail;
        const [error, setError] = useState('');
        const [busy, setBusy] = useState(false);
        const submit = async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            try {
                await updateChoreographer(
                    detail.person.id,
                    readProfileForm(new FormData(event.currentTarget))
                );
                onSaved();
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : t('Unable to save'));
            } finally {
                setBusy(false);
            }
        };
        return (
            <Panel as="form" onSubmit={submit} aria-label={t('Biography')}>
                <h2>{t('Biography')}</h2>
                <div className={cls.grid}>
                    <Field label="Stage name">
                        <input
                            name="stageName"
                            maxLength={200}
                            defaultValue={profile.stageName ?? ''}
                        />
                    </Field>
                    <Field label="Relationship">
                        <select name="relationshipStatus" defaultValue={profile.relationshipStatus}>
                            {RELATIONSHIP_STATUSES.map((value) => (
                                <option key={value} value={value}>
                                    {t(value)}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Country code">
                        <input
                            name="countryCode"
                            maxLength={2}
                            placeholder="NL"
                            defaultValue={profile.countryCode ?? ''}
                        />
                    </Field>
                    <Field label="City">
                        <input name="city" maxLength={120} defaultValue={profile.city ?? ''} />
                    </Field>
                    <Field label="Time zone">
                        <input
                            name="timezone"
                            maxLength={64}
                            placeholder="Europe/Amsterdam"
                            defaultValue={profile.timezone ?? ''}
                        />
                    </Field>
                    <Field label="Dance styles (comma separated)">
                        <input name="styles" defaultValue={profile.styles.join(', ')} />
                    </Field>
                    <Field label="Languages (comma separated)">
                        <input name="languages" defaultValue={profile.languages.join(', ')} />
                    </Field>
                    <LinkFields detail={detail} />
                    <div className={cls.wide}>
                        <Field label="Short biography">
                            <textarea
                                name="bioShort"
                                rows={3}
                                maxLength={600}
                                defaultValue={profile.bioShort ?? ''}
                            />
                        </Field>
                    </div>
                    <div className={cls.wide}>
                        <Field label="Full biography">
                            <textarea
                                name="bioFull"
                                rows={10}
                                defaultValue={profile.bioFull ?? ''}
                            />
                        </Field>
                    </div>
                </div>
                <RequestState error={error} loading={false} />
                <div className={cls.actions}>
                    <Button type="submit" disabled={busy}>
                        {t('Save')}
                    </Button>
                </div>
            </Panel>
        );
    }
);
