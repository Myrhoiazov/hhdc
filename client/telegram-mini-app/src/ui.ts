import { ApiError } from './api';

export const escapeHtml = (value: unknown) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export const renderFailure = (
    container: HTMLElement,
    error: unknown,
    retry?: () => void,
) => {
    const denied = error instanceof ApiError && (error.status === 401 || error.status === 403);
    container.innerHTML = `
        <section class="state-card" role="alert">
            <span class="state-symbol" aria-hidden="true">${denied ? '×' : '↻'}</span>
            <h2>${denied ? 'Нет доступа' : 'Не удалось загрузить'}</h2>
            <p>${denied ? 'Откройте Mini App из чата с ботом или попросите администратора проверить привязку.' : 'Проверьте соединение и попробуйте снова.'}</p>
            ${retry && !denied ? '<button class="button button--primary" type="button" data-retry>Повторить</button>' : ''}
        </section>`;
    container.querySelector<HTMLButtonElement>('[data-retry]')?.addEventListener('click', retry ?? (() => {}));
};
