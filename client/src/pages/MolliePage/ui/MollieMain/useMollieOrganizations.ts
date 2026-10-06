import { useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';

export interface OrganizationProfile {
    id: string;
    businessCategory: string;
    categoryCode: number;
    countriesOfActivity: string[];
    createdAt: string;
    description: string;
    email: string;
    mode: 'live' | 'test';
    name: string;
    phone: string;
    status: 'verified' | 'unverified' | string;
    website?: string;
}

export const useMollieOrganizations = () => {
    const [organizations, setOrganizations] = useState<OrganizationProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(false);

            try {
                const response = await $apiPrivate.get<OrganizationProfile>('/mollie/organizations');
                setOrganizations([response.data]);
            } catch {
                setError(true);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    return { organizations, isLoading, error };
};