import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { ChoreographerCategory } from '../ChoreographerCard/ChoreographerCard';
import { CATEGORIES, CATEGORY_LABELS, LANGS, Lang } from './useChoreographerModal';
import s from './ChoreographerModal.module.scss';

interface ChoreographerDetailsFormProps {
    lang: Lang;
    setLang: (value: Lang) => void;
    firstNameValue: string;
    lastNameValue: string;
    setFirstName: (value: string) => void;
    setLastName: (value: string) => void;
    phone: string;
    setPhone: (value: string) => void;
    birthday: string;
    setBirthday: (value: string) => void;
    email: string;
    setEmail: (value: string) => void;
    experience: string;
    setExperience: (value: string) => void;
    category: ChoreographerCategory | '';
    setCategory: (value: ChoreographerCategory | '') => void;
    showOnSite: boolean;
    setShowOnSite: (value: boolean) => void;
    description: string;
    setDescription: (value: string) => void;
    templateDescription: string;
    setTemplateDescription: (value: string) => void;
}

const LangTabs = ({ lang, onSelect }: { lang: Lang; onSelect: (value: Lang) => void }) => (
    <div className={s.langTabs}>
        {LANGS.map((l) => (
            <button
                key={l}
                type="button"
                className={classNames(s.langTab, { [s.langActive]: lang === l })}
                onClick={() => onSelect(l)}
            >
                {l}
            </button>
        ))}
    </div>
);

const TextField = ({
    label,
    value,
    onChange,
    required,
    type = 'text',
    placeholder,
    small,
    min,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    type?: string;
    placeholder?: string;
    small?: boolean;
    min?: number;
}) => (
    <div className={s.field}>
        <label className={s.label}>
            {label} {required && <span className={s.req}>*</span>}
        </label>
        <input
            className={small ? s.inputSmall : s.input}
            type={type}
            min={min}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    </div>
);

const NameFields = ({
    lang,
    firstNameValue,
    setFirstName,
    lastNameValue,
    setLastName,
}: {
    lang: Lang;
    firstNameValue: string;
    setFirstName: (value: string) => void;
    lastNameValue: string;
    setLastName: (value: string) => void;
}) => {
    const { t } = useTranslation();
    return (
        <div className={s.row}>
            <TextField label={`${t('Имя')} (${lang})`} value={firstNameValue} onChange={setFirstName} required={lang === 'RU'} />
            <TextField label={`${t('Фамилия')} (${lang})`} value={lastNameValue} onChange={setLastName} required={lang === 'RU'} />
        </div>
    );
};

const ContactFields = ({
    phone,
    setPhone,
    birthday,
    setBirthday,
    email,
    setEmail,
    experience,
    setExperience,
}: {
    phone: string;
    setPhone: (value: string) => void;
    birthday: string;
    setBirthday: (value: string) => void;
    email: string;
    setEmail: (value: string) => void;
    experience: string;
    setExperience: (value: string) => void;
}) => {
    const { t } = useTranslation();
    return (
        <>
            <div className={s.row}>
                <TextField label={t('Телефон')} value={phone} onChange={setPhone} placeholder="+380..." />
                <TextField label={t('Дата рождения')} value={birthday} onChange={setBirthday} type="date" />
            </div>
            <TextField label={t('Email')} value={email} onChange={setEmail} type="email" placeholder="mail@example.com" />
            <TextField label={t('Опыт (лет)')} value={experience} onChange={setExperience} type="number" small min={0} />
        </>
    );
};

const CategoryField = ({
    category,
    onSelect,
}: {
    category: ChoreographerCategory | '';
    onSelect: (value: ChoreographerCategory | '') => void;
}) => {
    const { t } = useTranslation();
    return (
        <div className={s.field}>
            <label className={s.label}>{t('Категория')}</label>
            <div className={s.categoryGroup}>
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        type="button"
                        className={classNames(s.categoryBtn, { [s.categoryActive]: category === cat }, [s[`cat_${cat.toLowerCase()}`]])}
                        onClick={() => onSelect(category === cat ? '' : cat)}
                    >
                        {CATEGORY_LABELS[cat]}
                    </button>
                ))}
                {category && (
                    <button type="button" className={s.clearCat} onClick={() => onSelect('')}>{t('К без категории')}</button>
                )}
            </div>
        </div>
    );
};

const SiteAndDescriptionFields = ({
    showOnSite,
    setShowOnSite,
    description,
    setDescription,
    templateDescription,
    setTemplateDescription,
}: {
    showOnSite: boolean;
    setShowOnSite: (value: boolean) => void;
    description: string;
    setDescription: (value: string) => void;
    templateDescription: string;
    setTemplateDescription: (value: string) => void;
}) => {
    const { t } = useTranslation();
    return (
        <>
            <div className={s.toggleRow}>
                <label className={s.label}>{t('Показывать на сайте')}</label>
                <label className={s.toggle}>
                    <input type="checkbox" checked={showOnSite} onChange={(e) => setShowOnSite(e.target.checked)} />
                    <span className={s.toggleSlider} />
                </label>
            </div>
            <div className={s.field}>
                <label className={s.label}>{t('Описание')}</label>
                <textarea
                    className={s.textarea}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="В своей работе уделяет внимание..."
                />
            </div>
            <div className={s.field}>
                <label className={s.label}>{t('Шаблонное описание')}</label>
                <textarea
                    className={s.textarea}
                    rows={4}
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Обладает такими стилями, как: Jazz-Funk..."
                />
            </div>
        </>
    );
};

export const ChoreographerDetailsForm = memo((props: ChoreographerDetailsFormProps) => {
    const {
        lang, setLang,
        firstNameValue, lastNameValue, setFirstName, setLastName,
        phone, setPhone, birthday, setBirthday, email, setEmail,
        experience, setExperience, category, setCategory,
        showOnSite, setShowOnSite,
        description, setDescription, templateDescription, setTemplateDescription,
    } = props;

    return (
        <>
            <LangTabs lang={lang} onSelect={setLang} />

            <NameFields
                lang={lang}
                firstNameValue={firstNameValue}
                setFirstName={setFirstName}
                lastNameValue={lastNameValue}
                setLastName={setLastName}
            />

            <ContactFields
                phone={phone}
                setPhone={setPhone}
                birthday={birthday}
                setBirthday={setBirthday}
                email={email}
                setEmail={setEmail}
                experience={experience}
                setExperience={setExperience}
            />

            <CategoryField category={category} onSelect={setCategory} />

            <SiteAndDescriptionFields
                showOnSite={showOnSite}
                setShowOnSite={setShowOnSite}
                description={description}
                setDescription={setDescription}
                templateDescription={templateDescription}
                setTemplateDescription={setTemplateDescription}
            />
        </>
    );
});
