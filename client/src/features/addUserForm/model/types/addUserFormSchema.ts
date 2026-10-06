import { ServerError, ValidateClientError } from "../consts/consts";
import { IProfile } from "@/entities/Profile";

export interface UserFormSchema {
    data?: IProfile,
    isLoading: boolean,
    error?: ServerError,
    readonly: boolean,
    validateErrors?: ValidateClientError[]
}