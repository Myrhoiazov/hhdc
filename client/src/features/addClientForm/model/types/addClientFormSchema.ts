import { Client } from "@/entities/Client";
import { ServerError, ValidateClientError } from "../consts/consts";

export interface ClientSchema {
    data?: Client,
    form?: Client,
    isLoading: boolean,
    error?: ServerError,
    readonly: boolean,
    validateErrors?: ValidateClientError[]
}