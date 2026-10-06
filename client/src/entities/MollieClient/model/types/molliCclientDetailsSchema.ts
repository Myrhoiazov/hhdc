import { MollieClient } from "./mollieClient";

export interface MollieClientDetailsSchema {
    isLoading: boolean;
    error?: string;
    data?: MollieClient;
}