import { lazy } from 'react';

export const FinancePageAsync = lazy(() =>
    import('./FinancePage').then((module) => ({ default: module.FinancePage }))
);
