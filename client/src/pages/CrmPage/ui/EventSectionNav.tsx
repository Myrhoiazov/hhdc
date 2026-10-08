import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import own from './EventSectionNav.module.scss';

// The blocks of the event page, in the order they appear. A block the viewer has no right to see
// is not on the page, and then it is not in the navigation either.
const SECTIONS: Array<{ id: string; label: string }> = [
    { id: 'event-sales', label: 'Ticket sales' },
    { id: 'event-expenses', label: 'Expenses' },
    { id: 'event-ticket-types', label: 'Ticket types' },
    { id: 'event-registrations', label: 'Registrations' },
    { id: 'event-choreographers', label: 'Choreographers' },
    { id: 'event-add-person', label: 'Add a person' },
    { id: 'event-documents', label: 'Documents' },
];

// The navigation is sticky, so a block is scrolled to just below it instead of under it.
const NAV_CLEARANCE_PX = 72;

const scrollToSection = (id: string): void => {
    const section = document.getElementById(id);
    if (!section) return;
    section.style.scrollMarginTop = `${NAV_CLEARANCE_PX}px`;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const EventSectionNav = memo(() => {
    const { t } = useTranslation();
    const [present, setPresent] = useState(SECTIONS);
    // Read after the page has rendered: only then is it known which blocks are there.
    useEffect(() => { setPresent(SECTIONS.filter(section => document.getElementById(section.id))); }, []);
    return <nav className={own.EventSectionNav} aria-label={t('Sections of the event page')}>
        {present.map(section => <button key={section.id} type="button" className={own.link} onClick={() => scrollToSection(section.id)}>{t(section.label)}</button>)}
    </nav>;
});
