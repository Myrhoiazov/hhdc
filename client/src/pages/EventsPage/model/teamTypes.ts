// Whose row is open for a change, and for which one.
export type Open = { memberId: string; mode: 'edit' | 'pay' } | null;

// The pay entered for a member of the team.
export interface TeamPayment {
    amount: string;
    expenseDate: string | null;
    paid: boolean;
}
