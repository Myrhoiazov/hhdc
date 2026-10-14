interface Named {
    displayName?: string | null;
    firstName: string;
    lastName: string;
}

// The name a person is shown by: the name they go by, else their first and last names.
export const fullNameOf = (person: Named) =>
    person.displayName || `${person.firstName} ${person.lastName}`.trim();
