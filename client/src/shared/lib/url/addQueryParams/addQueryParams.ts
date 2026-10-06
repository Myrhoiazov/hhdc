export function getQueryParams(params: OptionalRecord<string, string>) {
    const searchParams = new URLSearchParams(window.location.search);

    Object.entries(params).forEach(([name, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.set(name, value);
        } else {
            searchParams.delete(name);
        }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
}

/**
 * Функция добавления параметров строки запроса в URL
 * @param params
 */
export function addQueryParams(params: OptionalRecord<string, string>) {
    const newUrl = getQueryParams(params);
    const fullUrl = window.location.pathname + newUrl;
    window.history.pushState(null, '', fullUrl);
}
