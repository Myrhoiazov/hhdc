export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type InvoiceDocumentType = 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

export interface InvoiceActor {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
}

export interface InvoicePayment {
    id: number;
    amountCents: number;
    paidAt: string;
    method: 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'OTHER';
    reference?: string | null;
    note?: string | null;
    createdBy?: InvoiceActor | null;
}

export interface InvoiceAuditLog {
    id: number;
    action: string;
    createdAt: string;
    actor?: InvoiceActor | null;
}

export interface InvoiceMolliePayment {
    id: number;
    mollieId?: string | null;
    status: string;
    checkoutUrl?: string | null;
    amountValue: number | string;
    refundedAmount: number | string;
    chargedBackAmount: number | string;
    paidAt?: string | null;
}

export interface InvoiceMolliePaymentLink {
    id: number;
    mollieId: string;
    paymentUrl: string;
    amountCents: number;
    expiresAt?: string | null;
    archived: boolean;
    paidAt?: string | null;
}

export type InvoiceDeliveryType = 'INITIAL' | 'RESEND' | 'REMINDER_BEFORE_DUE' | 'REMINDER_OVERDUE';
export type InvoiceDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface InvoiceDelivery {
    id: number;
    type: InvoiceDeliveryType;
    status: InvoiceDeliveryStatus;
    recipientEmail: string;
    subject: string;
    errorMessage?: string | null;
    sentAt?: string | null;
    firstViewedAt?: string | null;
    lastViewedAt?: string | null;
    viewCount: number;
    createdAt: string;
    createdBy?: InvoiceActor | null;
}

export interface InvoiceItem {
    id: number;
    description: string;
    period?: string | null;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
    group?: { id: number; name: string } | null;
}

export interface Invoice {
    id: number;
    number: string;
    documentType: InvoiceDocumentType;
    status: InvoiceStatus;
    billToName: string;
    billToEmail?: string | null;
    issueDate: string;
    dueDate?: string | null;
    paidAt?: string | null;
    currency: string;
    totalCents: number;
    paidAmountCents: number;
    creditedAmountCents: number;
    balanceDueCents: number;
    client?: InvoiceClient | null;
    businessBrandId?: number | null;
    businessBrand?: InvoiceBusinessBrand | null;
    issuerName: string;
    issuerAddress?: string | null;
    issuerEmail?: string | null;
    bankName?: string | null;
    iban?: string | null;
    paymentReference?: string | null;
    note?: string | null;
    showPaymentButton: boolean;
    showPaymentQr: boolean;
    items: InvoiceItem[];
    payments: InvoicePayment[];
    molliePayments: InvoiceMolliePayment[];
    molliePaymentLinks: InvoiceMolliePaymentLink[];
    deliveries: InvoiceDelivery[];
    auditLogs: InvoiceAuditLog[];
    // Only present on mutation responses (create/update/status/payment/adjustment) — the
    // invoice list endpoint (getInvoices) doesn't include it, see
    // docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md.
    // Kept intentionally: credit/debit notes are a shipped feature (the UI creates them
    // via POST /invoices/:id/adjustments in invoiceActionRequests.ts), so the field
    // matches the server's invoiceInclude.adjustments. No component renders the parent's
    // adjustment list yet, but the API surface is live, not dead weight.
    adjustments?: Pick<Invoice, 'id' | 'number' | 'documentType' | 'totalCents' | 'status'>[];
}

export interface InvoicesResponse {
    items: Invoice[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface InvoiceBusinessBrand {
    id: number;
    name: string;
    logoUrl?: string | null;
    primaryColor: string;
    address?: string | null;
    email?: string | null;
    organization?: {
        registrationAddress?: string | null;
        postalCode?: string | null;
        city?: string | null;
    } | null;
    isDefault?: boolean;
    isActive?: boolean;
}

export interface InvoiceClient {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string;
}

export interface InvoiceGroup {
    id: number;
    name: string;
    lessonPriceCents?: number;
    branch?: InvoiceBranch | null;
}

export interface InvoiceBranch {
    id: number;
    name: string;
    address?: string | null;
    city?: string | null;
    isActive?: boolean;
}
