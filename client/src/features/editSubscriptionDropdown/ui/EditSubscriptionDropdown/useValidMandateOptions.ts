import { useMemo } from 'react';
import { Mandate } from '@/entities/Mandate';

export const useValidMandateOptions = (mandates: Mandate[]) => useMemo(() => mandates
    .filter((mandate) => mandate.status === 'valid' && mandate.id)
    .map((mandate) => ({
        value: mandate.id!,
        content: `${mandate.id} · ${mandate.method || 'unknown'}`,
    })), [mandates]);
