import axios from 'axios';

export interface Organization {
    id?: number;
    legalName: string;
    kvkNumber: string;
    vatNumber: string;
    registrationAddress: string;
    postalCode: string;
    city: string;
    countryCode: string;
    email: string;
    phone: string;
    website: string;
    bankName: string;
    iban: string;
    mollieOrganizationId: string;
}

export interface Brand {
    id?: number;
    organizationId: number;
    name: string;
    slug: string;
    logoUrl: string;
    primaryColor: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    mollieProfileId: string;
    isDefault: boolean;
    isActive: boolean;
}

export const emptyOrganization: Organization = {
    legalName: '', kvkNumber: '', vatNumber: '', registrationAddress: '', postalCode: '', city: '',
    countryCode: 'NL', email: '', phone: '', website: '', bankName: '', iban: '', mollieOrganizationId: '',
};

export const emptyBrand = (organizationId = 0): Brand => ({
    organizationId, name: '', slug: '', logoUrl: '', primaryColor: '#1d1d33', email: '', phone: '',
    website: '', address: '', mollieProfileId: '', isDefault: false, isActive: true,
});

export const extractApiErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        const message = error.response?.data?.message;
        if (typeof message === 'string' && message.length > 0) {
            return message;
        }
    }
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
};

