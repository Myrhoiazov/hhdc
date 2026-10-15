interface ApiFailure {
    response?: { data?: { error?: { message?: string } } };
}

// What to tell the reader when a request failed: the reason the server gave, else the error itself.
export const messageOf = (cause: unknown) => {
    const apiMessage = (cause as ApiFailure | null)?.response?.data?.error?.message;
    return apiMessage || (cause instanceof Error ? cause.message : 'Request failed');
};
