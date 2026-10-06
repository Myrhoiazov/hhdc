export interface SearchClientHit {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
    branchName: string | null;
}

export interface SearchPaymentHit {
    id: number;
    mollieId: string | null;
    description: string | null;
    amountValue: string;
    amountCurrency: string;
    status: string;
    createdAt: string;
    customerId: number;
    customerName: string | null;
}

export interface SearchGroupHit {
    id: number;
    name: string;
    style: string;
    level: string;
    branchId: number | null;
    branchName: string | null;
}

export interface SearchChoreographerHit {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
}

export interface SearchBranchHit {
    id: number;
    name: string;
    city: string | null;
    address: string | null;
}

export interface SearchTransactionHit {
    id: number;
    description: string | null;
    amount: number;
    type: string;
    category: string;
    date: string;
}

export interface GlobalSearchResponse {
    query: string;
    clients: { total: number; items: SearchClientHit[] };
    payments: { total: number; items: SearchPaymentHit[] };
    groups: { total: number; items: SearchGroupHit[] };
    choreographers: { total: number; items: SearchChoreographerHit[] };
    branches: { total: number; items: SearchBranchHit[] };
    // Отсутствует целиком в ответе, если пользователь не ADMIN — см. GLOBAL_SEARCH_SPEC.md.
    transactions?: { total: number; items: SearchTransactionHit[] };
}

export type SearchCategoryKey = 'clients' | 'payments' | 'groups' | 'choreographers' | 'branches' | 'transactions';

export interface FlatSearchResult {
    category: SearchCategoryKey;
    key: string;
    title: string;
    subtitle?: string;
    route: string;
}
