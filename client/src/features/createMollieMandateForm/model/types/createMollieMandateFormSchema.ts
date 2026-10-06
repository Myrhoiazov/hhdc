import { Mandate } from "@/entities/Mandate";
import { MollieClient } from "@/entities/MollieClient";

export interface CreateMollieMandateFormSchema {
    data?: Mandate,
    customers?: MollieClient[],
    isLoading: boolean,
    error?: string,
}