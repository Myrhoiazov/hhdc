// The blocks of the event page, in the order they appear. A block the viewer has no right to see
// is not on the page, and then it is not in the navigation either.
export const SECTIONS: Array<{ id: string; label: string }> = [
    { id: 'event-sales', label: 'Ticket sales' },
    { id: 'event-expenses', label: 'Expenses' },
    { id: 'event-ticket-types', label: 'Ticket types' },
    { id: 'event-registrations', label: 'Registrations' },
    { id: 'event-choreographers', label: 'Choreographers' },
    { id: 'event-add-person', label: 'Add a person' },
    { id: 'event-team', label: 'Team' },
    { id: 'event-documents', label: 'Documents' },
];

// The navigation is sticky, so a block is scrolled to just below it instead of under it.
const NAV_CLEARANCE_PX = 72;

export const scrollToSection = (id: string): void => {
    const section = document.getElementById(id);
    if (!section) return;
    section.style.scrollMarginTop = `${NAV_CLEARANCE_PX}px`;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
