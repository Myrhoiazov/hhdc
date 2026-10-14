import { apiFetch } from '../api';
import { escapeHtml, renderFailure } from '../ui';

interface ClientSearchResult {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
    mollieLinks: Array<{ customerId: number }>;
}

export const renderSearch = (container: HTMLElement): void => {
    container.innerHTML = `
        <div class="section-heading"><div><h2>Найти ученика</h2><p>По имени, email или телефону</p></div></div>
        <div class="field"><label for="student-search">Поиск</label><input id="student-search" type="search" autocomplete="off" placeholder="Например, Анна" /></div>
        <div id="search-results" aria-live="polite"></div>`;
    const input = container.querySelector<HTMLInputElement>('#student-search');
    const results = container.querySelector<HTMLDivElement>('#search-results');
    if (!input || !results) return;

    let debounceHandle: ReturnType<typeof setTimeout>;
    let requestNumber = 0;
    input.addEventListener('input', () => {
        clearTimeout(debounceHandle);
        const query = input.value.trim();
        requestNumber += 1;
        const currentRequest = requestNumber;
        if (!query) { results.innerHTML = ''; return; }
        debounceHandle = setTimeout(async () => {
            results.innerHTML = '<div class="card">Ищу…</div>';
            try {
                const clients = await apiFetch<ClientSearchResult[]>(`/clients?_q=${encodeURIComponent(query)}`);
                if (currentRequest !== requestNumber) return;
                results.innerHTML = clients.length ? clients.map((client) => {
                    const name = [client.firstName, client.lastName].filter(Boolean).join(' ') || `Ученик #${client.id}`;
                    const contact = client.email || client.phoneNumber || 'Контакт не указан';
                    const linked = Boolean(client.mollieLinks?.length);
                    return `<article class="card"><strong>${escapeHtml(name)}</strong><div class="card-meta">${escapeHtml(contact)}</div><span class="badge ${linked ? 'badge--linked' : 'badge--unlinked'}">${linked ? 'Mollie подключён' : 'Без Mollie'}</span></article>`;
                }).join('') : '<section class="state-card"><h2>Ничего не найдено</h2><p>Проверьте написание или попробуйте телефон.</p></section>';
            } catch (error) {
                if (currentRequest === requestNumber) renderFailure(results, error, () => input.dispatchEvent(new Event('input')));
            }
        }, 300);
    });
    input.focus();
};
