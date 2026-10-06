
import { MollieClient } from "@/entities/MollieClient";

export interface AddMollieClientSchema {
    data?: MollieClient,
    isLoading: boolean,
    error?: string
}