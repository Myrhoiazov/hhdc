import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addBioVersion, BIO_KINDS, BioKind, BioVersion, listBioVersions } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState } from '../common';
import cls from '../CrmPage.module.scss';
import own from './Choreographers.module.scss';

const VariantCard = memo(({ version, earlier }: { version: BioVersion; earlier: number }) => {
    const { t } = useTranslation();
    return <article className={own.variant} aria-label={`${version.locale.toUpperCase()} · ${t(`BIO_${version.kind}`)}`}>
        <div className={own.chips}>
            <span className={own.chip}>{version.locale.toUpperCase()}</span>
            <span className={own.chip}>{t(`BIO_${version.kind}`)}</span>
            <span className={own.chip}>{`v${version.version}`}</span>
            {earlier > 0 && <span className={own.secondary}>{`${t('Earlier versions')}: ${earlier}`}</span>}
        </div>
        <p className={own.bio}>{version.content}</p>
    </article>;
});

const VersionForm = memo(({ personId, onSaved }: { personId: string; onSaved: () => void }) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        setBusy(true); setError('');
        try {
            await addBioVersion(personId, { locale: String(form.get('locale') ?? '').trim(), kind: String(form.get('kind')) as BioKind, content: String(form.get('content') ?? '') });
            formElement.reset(); onSaved();
        } catch (cause) { setError(cause instanceof Error ? cause.message : t('Unable to save')); }
        finally { setBusy(false); }
    };
    return <form className={cls.grid} onSubmit={submit} aria-label={t('Add biography variant')}>
        <Field label="Language code"><input name="locale" required maxLength={5} placeholder="en" /></Field>
        <Field label="Variant"><select name="kind" defaultValue="PROMO">{BIO_KINDS.map((kind) => <option key={kind} value={kind}>{t(`BIO_${kind}`)}</option>)}</select></Field>
        <div className={cls.wide}><Field label="Variant text"><textarea name="content" rows={6} required /></Field></div>
        <div className={cls.wide}><RequestState error={error} loading={false} /></div>
        <div className={cls.wide}><Button type="submit" disabled={busy}>{t('Save as new version')}</Button></div>
    </form>;
});

// Language and promotional variants of the biography. Saving never edits a version: it adds one.
export const BioVersions = memo(({ personId, canEdit }: { personId: string; canEdit: boolean }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listBioVersions(personId), [personId]);
    const versions = useResource(load);
    const all = versions.data ?? [];
    const earlier = (current: BioVersion) => all.filter((item) => !item.isCurrent && item.locale === current.locale && item.kind === current.kind).length;
    return <section className={cls.panel} aria-label={t('Biography variants')}>
        <h2>{t('Biography variants')}</h2>
        <p className={cls.muted}>{t('Translations and promotional texts. Each save keeps the previous version.')}</p>
        <RequestState error={versions.error} loading={versions.loading && !versions.data} />
        {all.filter((item) => item.isCurrent).map((item) => <VariantCard key={item.id} version={item} earlier={earlier(item)} />)}
        {versions.data?.length === 0 && <p className={cls.muted}>{t('No variants yet.')}</p>}
        {canEdit && <VersionForm personId={personId} onSaved={() => void versions.refresh()} />}
    </section>;
});
