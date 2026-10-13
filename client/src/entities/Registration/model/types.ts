export const REGISTRATION_STATUSES = [
    'PENDING',
    'CONFIRMED',
    'CHECKED_IN',
    'CANCELLED',
    'NO_SHOW',
] as const;

export interface EventRegistration {
    id: string;
    status: string;
    registrationSource: string;
    createdAt: string;
    person: {
        id: string;
        displayName: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
        country: string | null;
    };
    ticket: { ticketType: string; status: string } | null;
}

// The registrations of an event are one block among many on its page, so a page of them is shorter.
export const REGISTRATIONS_PAGE_SIZE = 20;

export interface RegistrationFilters {
    q: string;
    status: (typeof REGISTRATION_STATUSES)[number] | '';
}
