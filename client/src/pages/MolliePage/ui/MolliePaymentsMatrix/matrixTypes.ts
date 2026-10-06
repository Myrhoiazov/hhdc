export interface MatrixMonth {
    key: string;
    label: string;
    year: number;
    month: number;
}

export interface MatrixCell {
    paid: boolean;
    paidCount: number;
    issueCount: number;
    amount: number;
    currency: string;
}

export interface MatrixRow {
    key: string;
    clientId: number | null;
    customerId: number | null;
    name: string;
    payerNames: string[];
    branch: string | null;
    cells: Record<string, MatrixCell>;
    paidMonths: number;
}
