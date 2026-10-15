import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import own from './EventSectionNav.module.scss';
import { SECTIONS, scrollToSection } from '../../model/sections';

export const EventSectionNav = memo(() => {
    const { t } = useTranslation();
    const [present, setPresent] = useState(SECTIONS);
    // Read after the page has rendered: only then is it known which blocks are there.
    useEffect(() => {
        setPresent(SECTIONS.filter((section) => document.getElementById(section.id)));
    }, []);
    return (
        <nav className={own.EventSectionNav} aria-label={t('Sections of the event page')}>
            {present.map((section) => (
                <button
                    key={section.id}
                    type="button"
                    className={own.link}
                    onClick={() => scrollToSection(section.id)}
                >
                    {t(section.label)}
                </button>
            ))}
        </nav>
    );
});
