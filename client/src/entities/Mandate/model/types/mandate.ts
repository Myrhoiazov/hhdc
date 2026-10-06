import { MandateMethod } from "@/entities/MandateMethod";

export interface Mandate {
    id?: string;
    customerId?: string;
    consumerBic?: string;
    consumerName?: string;
    consumerAccount?: string;
    signatureDate?: string;
    mandateReference?: string;
    mode?: string;
    status?: string;
    method?: MandateMethod;
    createdAt?: string;
    updatedAt?: string;
}
