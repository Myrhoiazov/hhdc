import { Client, ServerError } from './client';

export interface ClientDetailsSchema {
    isLoading: boolean;
    error?: ServerError;
    data?: Client;
}