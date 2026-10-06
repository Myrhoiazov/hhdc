import { MollieIncidentsResponse } from './mollieIncidentTypes';

export const buildIncidentSummaryCards = (totals: MollieIncidentsResponse['totals']) => [
    { label: 'Всего проблем', value: totals.total, accent: totals.total ? 'danger' : 'success' },
    { label: 'Платежи', value: totals.payments, accent: totals.payments ? 'danger' : 'neutral' },
    { label: 'Подписки', value: totals.subscriptions, accent: totals.subscriptions ? 'warning' : 'neutral' },
    { label: 'Профили: email/ученик', value: totals.customers, accent: totals.customers ? 'info' : 'neutral' },
];
