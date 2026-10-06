import { AppRoutes, RoutePath } from '@/shared/config/routeConfig/routeConfig';
import { getRouteClientDetails, getRouteMollieDetails } from '@/shared/const/router';
import {
    GlobalSearchResponse,
    SearchBranchHit,
    SearchCategoryKey,
    SearchChoreographerHit,
    SearchClientHit,
    SearchGroupHit,
    SearchPaymentHit,
    SearchTransactionHit,
} from '../../model/types/globalSearch';

export interface FlatResult {
    category: SearchCategoryKey;
    key: string;
    title: string;
    subtitle?: string;
    route: string;
}

const mapClientHit = (hit: SearchClientHit): FlatResult => ({
    category: 'clients',
    key: `clients-${hit.id}`,
    title: [hit.firstName, hit.lastName].filter(Boolean).join(' ') || hit.email || `Клиент #${hit.id}`,
    subtitle: [hit.phoneNumber, hit.email].filter(Boolean).join(' · ') || hit.branchName || undefined,
    route: getRouteClientDetails(String(hit.id)),
});

const mapPaymentHit = (hit: SearchPaymentHit): FlatResult => ({
    category: 'payments',
    key: `payments-${hit.id}`,
    title: hit.customerName || hit.mollieId || `Платёж #${hit.id}`,
    subtitle: `${hit.amountValue} ${hit.amountCurrency} · ${hit.status}`,
    route: getRouteMollieDetails(String(hit.customerId)),
});

const mapGroupHit = (hit: SearchGroupHit): FlatResult => ({
    category: 'groups',
    key: `groups-${hit.id}`,
    title: hit.name,
    subtitle: [hit.style, hit.level, hit.branchName].filter(Boolean).join(' · ') || undefined,
    route: `${RoutePath[AppRoutes.DANCE_GROUPS]}?highlight=${hit.id}`,
});

const mapChoreographerHit = (hit: SearchChoreographerHit): FlatResult => ({
    category: 'choreographers',
    key: `choreographers-${hit.id}`,
    title: `${hit.firstName} ${hit.lastName}`,
    subtitle: [hit.phone, hit.email].filter(Boolean).join(' · ') || undefined,
    route: RoutePath[AppRoutes.CHOREOGRAPHERS],
});

const mapBranchHit = (hit: SearchBranchHit): FlatResult => ({
    category: 'branches',
    key: `branches-${hit.id}`,
    title: hit.name,
    subtitle: [hit.city, hit.address].filter(Boolean).join(', ') || undefined,
    route: RoutePath[AppRoutes.BRANCHES],
});

const mapTransactionHit = (hit: SearchTransactionHit): FlatResult => ({
    category: 'transactions',
    key: `transactions-${hit.id}`,
    title: hit.description || `Транзакция #${hit.id}`,
    subtitle: `${hit.amount} · ${hit.category}`,
    route: RoutePath[AppRoutes.TRANSACTIONS],
});

// Порядок вывода категорий фиксирован (см. GLOBAL_SEARCH_SPEC.md, п.5) — внутри
// каждой категории результаты уже отсортированы backend'ом по релевантности.
export const buildFlatResults = (data: GlobalSearchResponse | null): FlatResult[] => {
    if (!data) return [];

    return [
        ...data.clients.items.map(mapClientHit),
        ...data.payments.items.map(mapPaymentHit),
        ...data.groups.items.map(mapGroupHit),
        ...data.choreographers.items.map(mapChoreographerHit),
        ...data.branches.items.map(mapBranchHit),
        ...(data.transactions?.items ?? []).map(mapTransactionHit),
    ];
};

export const groupByCategory = (results: FlatResult[]) => {
    const sections: { category: SearchCategoryKey; items: FlatResult[] }[] = [];
    results.forEach((result) => {
        const last = sections[sections.length - 1];
        if (last && last.category === result.category) {
            last.items.push(result);
        } else {
            sections.push({ category: result.category, items: [result] });
        }
    });
    return sections;
};
