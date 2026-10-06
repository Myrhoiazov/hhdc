import { useTranslation } from 'react-i18next';
import { type ChangeEvent } from 'react';
import { Page } from '@/widgets/Page/Page';
import { Organization, Brand, useOrganizationBrands } from '../useOrganizationBrands';
import s from './OrganizationBrandsPage.module.scss';

const getLogoSrc = (logoUrl: string) => logoUrl.startsWith('/') ? `${__API__}${logoUrl}` : logoUrl;
const textFields: Array<[keyof Organization, string]> = [
    ['legalName', 'Юридическое название *'], ['kvkNumber', 'KVK'], ['vatNumber', 'BTW / VAT'],
    ['registrationAddress', 'Адрес регистрации'], ['postalCode', 'Индекс'], ['city', 'Город'],
    ['countryCode', 'Страна'], ['email', 'Email'], ['phone', 'Телефон'], ['website', 'Сайт'],
    ['bankName', 'Банк'], ['iban', 'IBAN'], ['mollieOrganizationId', 'Mollie organization ID'],
];

const OrgHeader = ({ onSyncMollie }: { onSyncMollie: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className={s.header}>
            <div><h1>{t('Организация и бренды')}</h1><p>{t('Юридическое лицо и торговые названия для инвойсов.')}</p></div>
            <button onClick={onSyncMollie}>{t('Синхронизировать Mollie')}</button>
        </div>
    );
};

const OrgInfoSection = ({ organization, setOrganization, saving, saveOrganization }: {
    organization: Organization;
    setOrganization: (org: Organization) => void;
    saving: boolean;
    saveOrganization: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <section className={s.card}>
            <h2>{t('Юридическая организация')}</h2>
            <div className={s.grid}>
                {textFields.map(([key, label]) => (
                    <label key={key}>{label}
                        <input value={String(organization[key] ?? '')} onChange={(event) => setOrganization({ ...organization, [key]: event.target.value })} />
                    </label>
                ))}
            </div>
            <button className={s.primary} disabled={saving} onClick={saveOrganization}>{t('Сохранить реквизиты')}</button>
        </section>
    );
};

const BrandFormSection = ({ brandForm, setBrandForm, saving, uploadingLogo, uploadLogo, saveBrand, resetBrandForm }: {
    brandForm: Brand;
    setBrandForm: (form: Brand) => void;
    saving: boolean;
    uploadingLogo: boolean;
    uploadLogo: (e: ChangeEvent<HTMLInputElement>) => void;
    saveBrand: () => void;
    resetBrandForm: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <section className={s.card}>
            <h2>{brandForm.id ? `Редактировать ${brandForm.name}` : 'Добавить бренд / проект'}</h2>
            <div className={s.grid}>
                <label>{t('Название *')}<input value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} /></label>
                <label>{t('Slug *')}<input placeholder="talent-center-ddc" value={brandForm.slug} onChange={(e) => setBrandForm({ ...brandForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} /></label>
                <label>{t('Email')}<input value={brandForm.email} onChange={(e) => setBrandForm({ ...brandForm, email: e.target.value })} /></label>
                <label>{t('Телефон')}<input value={brandForm.phone} onChange={(e) => setBrandForm({ ...brandForm, phone: e.target.value })} /></label>
                <label>{t('Сайт')}<input value={brandForm.website} onChange={(e) => setBrandForm({ ...brandForm, website: e.target.value })} /></label>
                <label>{t('Адрес')}<input value={brandForm.address} onChange={(e) => setBrandForm({ ...brandForm, address: e.target.value })} /></label>
                <label>{t('Mollie profile ID')}<input value={brandForm.mollieProfileId} onChange={(e) => setBrandForm({ ...brandForm, mollieProfileId: e.target.value })} /></label>
                <label>{t('Цвет')}<input type="color" value={brandForm.primaryColor} onChange={(e) => setBrandForm({ ...brandForm, primaryColor: e.target.value })} /></label>
                <label>{t('Логотип')}
                    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingLogo} onChange={uploadLogo} />
                    {uploadingLogo && <small>Загрузка...</small>}
                </label>
                <label className={s.check}><input type="checkbox" checked={brandForm.isDefault} onChange={(e) => setBrandForm({ ...brandForm, isDefault: e.target.checked })} /> {t('Бренд по умолчанию')}</label>
            </div>
            {brandForm.logoUrl && <img className={s.logoPreview} src={getLogoSrc(brandForm.logoUrl)} alt={brandForm.name || 'Логотип'} />}
            <div className={s.actions}>
                <button className={s.primary} disabled={saving} onClick={saveBrand}>{t('Сохранить бренд')}</button>
                {brandForm.id && <button onClick={resetBrandForm}>{t('Отмена')}</button>}
            </div>
        </section>
    );
};

const BrandsListSection = ({ brands, onEdit, onArchive }: {
    brands: Brand[];
    onEdit: (brand: Brand) => void;
    onArchive: (id: number) => void;
}) => {
    const { t } = useTranslation();
    return (
        <section className={s.card}>
            <h2>{t('Бренды и проекты')}</h2>
            <div className={s.brands}>
                {brands.map((brand) => (
                    <article className={s.brand} key={brand.id}>
                        {brand.logoUrl ? <img src={getLogoSrc(brand.logoUrl)} alt={brand.name} /> : <span className={s.swatch} style={{ background: brand.primaryColor }} />}
                        <div><strong>{brand.name}</strong><small>{brand.isDefault ? 'По умолчанию · ' : ''}{brand.isActive ? 'Активен' : 'В архиве'}</small></div>
                        <button onClick={() => onEdit(brand)}>{t('Редактировать')}</button>
                        {brand.isActive && brand.id && <button className={s.danger} onClick={() => onArchive(brand.id!)}>{t('Архивировать')}</button>}
                    </article>
                ))}
            </div>
        </section>
    );
};

const OrganizationBrandsPage = () => {
    const {
        organization,
        setOrganization,
        brands,
        brandForm,
        setBrandForm,
        saving,
        uploadingLogo,
        saveOrganization,
        syncMollie,
        saveBrand,
        uploadLogo,
        archive,
        resetBrandForm,
    } = useOrganizationBrands();

    return (
        <Page>
            <OrgHeader onSyncMollie={syncMollie} />
            <OrgInfoSection organization={organization} setOrganization={setOrganization} saving={saving} saveOrganization={saveOrganization} />
            <BrandFormSection brandForm={brandForm} setBrandForm={setBrandForm} saving={saving} uploadingLogo={uploadingLogo} uploadLogo={uploadLogo} saveBrand={saveBrand} resetBrandForm={resetBrandForm} />
            <BrandsListSection brands={brands} onEdit={setBrandForm} onArchive={archive} />
        </Page>
    );
};

export default OrganizationBrandsPage;
