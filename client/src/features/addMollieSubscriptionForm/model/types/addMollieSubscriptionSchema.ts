import { MollieClient } from "@/entities/MollieClient";
import { MollieSubscription } from "@/entities/MollieSubscription";

export interface AddMollieSubscriptionSchema {
    data?: MollieSubscription
    customers?: MollieClient[]
    isLoading?: boolean
    error?: string
}