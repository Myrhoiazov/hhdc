type ApiErrorType = {
    status: number;
    message: string;
    errors?: any[];
};

export default class ApiError extends Error {
    public status: number;
    public errors: any[];

    constructor(status: number, message: string, errors: any[] = []) {
        super(message);
        this.status = status;
        this.errors = errors;

        // Устанавливаем имя класса в Error.name
        Object.setPrototypeOf(this, ApiError.prototype);
    }

    static UnauthorizedError(): ApiError {
        return new ApiError(401, 'Пользователь не авторизован');
    }

    static BadRequest(message: string, errors: any[] = []): ApiError {
        return new ApiError(400, message, errors);
    }
}
