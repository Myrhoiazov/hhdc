import { ServerError } from '../services/loginByUsername/loginByUsername';

export interface LoginSchema {
    email: string;
    password: string;
    isLoading: boolean;
    error?: ServerError;
}