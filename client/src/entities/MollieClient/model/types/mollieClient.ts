import { Mandate } from "@/entities/Mandate";
import { MollieSubscription } from "@/entities/MollieSubscription";
import { ClientLanguage } from "@/entities/Client";

export interface MolliePayment {
    id?: string | number;
    mollieId?: string;
    amountValue?: string | number;
    amountCurrency?: string;
    description?: string;
    method?: string;
    status?: string;
    paidAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface MollieLinkedClient {
    id: string | number;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    preferredLanguage?: ClientLanguage;
}

export interface MollieClientStudentLink {
    id: string | number;
    payerRelation?: string;
    linkSource?: string;
    isPrimary?: boolean;
    client?: MollieLinkedClient;
}

export interface MollieEvent {
    id: string | number;
    molliePaymentId: string;
    eventType: string;
    paymentStatus?: string;
    processingStatus: string;
    errorMessage?: string;
    receivedAt: string;
    processedAt?: string;
}

export interface MollieClient {
    id?: string,
    mollieId?: string,
    email?: string,
    givenName?: string,
    familyName?: string,
    city?: string,
    country?: string,
    postalCode?: string,
    streetAndNumber?: string,
    consumerAccount?: string,
    consumerName?: string,
    consumerBic?: string,
    payerName?: string,
    payerRelation?: string,
    linkSource?: string,
    // The Mollie customer's own language — this is who actually pays and receives
    // payment reminder emails, so it takes priority over the linked Client's language.
    preferredLanguage?: ClientLanguage,
    createdAt?: string
    client?: MollieLinkedClient | null
    clientLinks?: MollieClientStudentLink[]

    mandates?: Mandate[],
    subscriptions?: MollieSubscription[],
    payments?: MolliePayment[]
    events?: MollieEvent[]
}
