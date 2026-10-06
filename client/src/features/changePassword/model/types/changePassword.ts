export interface ChangePasswordFormData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export enum ChangePasswordError {
    PASSWORDS_DONT_MATCH = 'PASSWORDS_DONT_MATCH',
    CURRENT_PASSWORD_INCORRECT = 'CURRENT_PASSWORD_INCORRECT',
    SERVER_ERROR = 'SERVER_ERROR',
    REQUIRED_FIELDS = 'REQUIRED_FIELDS',
}
