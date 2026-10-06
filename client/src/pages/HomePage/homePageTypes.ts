export interface FailedPaymentCustomer {
    id: number;
    email?: string;
    givenName?: string;
    familyName?: string;
}

export interface FailedPayment {
    id: number;
    mollieId?: string;
    status: string;
    amountValue: number;
    amountCurrency: string;
    description?: string;
    updatedAt: string;
    customer?: FailedPaymentCustomer | null;
}

export interface MollieDashboardSummary {
    totalCustomers: number;
    activeSubscriptions: number;
    validMandates: number;
    paidThisMonth: number;
    failedPayments: number;
    monthlyRevenue: number;
    currency: string;
    latestFailedPayments: FailedPayment[];
}

interface SyncResult {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
}

export type FullSyncResult = Record<'customers' | 'mandates' | 'subscriptions' | 'payments', SyncResult>;

export type RevenueChartPeriod = 'year' | 'threeMonths' | 'month' | 'week';

export interface RevenueChartItem {
    key: string;
    label: string;
    income: number;
    expense: number;
}

export interface RevenueChartData {
    period: RevenueChartPeriod;
    updatedAt: string;
    incomeTotal: number;
    expenseTotal: number;
    balance: number;
    items: RevenueChartItem[];
}
