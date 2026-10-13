export interface MoneyTotals {
    tickets: number;
    revenue: string;
    discount: string;
    costs: string;
    result: string;
}

export interface EventMoney extends MoneyTotals {
    id: string;
    name: string;
    startAt: string;
}

export interface YearMoney extends MoneyTotals {
    year: number;
    events: EventMoney[];
}

export interface CountryRow {
    code: string;
    buyers: number;
    tickets: number;
    revenue: string;
}

export interface DashboardInsights {
    currency: string;
    totals: {
        revenue: string;
        costs: string;
        result: string;
        tickets: number;
        buyers: number;
        events: number;
    };
    years: YearMoney[];
    countries: CountryRow[];
    notGiven: number;
    notRecognised: number;
}
