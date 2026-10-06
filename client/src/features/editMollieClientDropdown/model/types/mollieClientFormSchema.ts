import { MollieClient } from "@/entities/MollieClient";

export interface MollieClientFormSchema {
    data?: MollieClient,
    form?: MollieClient,
    isLoading: boolean,
    error?: string,
    readonly: boolean,
}