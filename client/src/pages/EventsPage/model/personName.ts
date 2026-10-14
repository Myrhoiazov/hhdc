export const personName = (person: { displayName?: string; firstName: string; lastName: string }) =>
    person.displayName || `${person.firstName} ${person.lastName}`.trim() || '—';
