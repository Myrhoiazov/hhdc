import { ApiError, apiFetch } from '../api';
import { escapeHtml, renderFailure } from '../ui';

interface StudentDraft { firstName?: string; lastName?: string; phoneNumber?: string; email?: string; }

const labels: Record<keyof StudentDraft, string> = {
    firstName: 'Имя', lastName: 'Фамилия', phoneNumber: 'Телефон', email: 'Email',
};

const formMarkup = (draft: StudentDraft = {}) => `
    <div class="section-heading"><div><h2>Новый ученик</h2><p>Имя или фамилия обязательны</p></div></div>
    <form id="new-student-form" novalidate>
        ${Object.entries(labels).map(([name, label]) => `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" ${name === 'email' ? 'type="email" inputmode="email"' : ''} ${name === 'phoneNumber' ? 'type="tel" inputmode="tel"' : ''} value="${escapeHtml(draft[name as keyof StudentDraft] ?? '')}" autocomplete="${name === 'email' ? 'email' : name === 'phoneNumber' ? 'tel' : 'off'}" /></div><div class="field-error" data-error="${name}"></div>`).join('')}
        <button class="button button--primary" type="submit">Проверить данные</button>
    </form>`;

const readDraft = (form: HTMLFormElement): StudentDraft => Object.fromEntries(
    Array.from(new FormData(form).entries()).map(([key, value]) => [key, String(value).trim() || undefined]),
);

export const renderNewStudent = (container: HTMLElement, initial: StudentDraft = {}): void => {
    container.innerHTML = formMarkup(initial);
    const form = container.querySelector<HTMLFormElement>('#new-student-form');
    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const draft = readDraft(form);
        if (!draft.firstName && !draft.lastName) {
            const error = container.querySelector<HTMLElement>('[data-error="firstName"]');
            if (error) error.textContent = 'Укажите имя или фамилию';
            return;
        }
        renderConfirmation(container, draft);
    });
};

const renderConfirmation = (container: HTMLElement, draft: StudentDraft) => {
    const populated = Object.entries(labels).filter(([key]) => draft[key as keyof StudentDraft]);
    container.innerHTML = `
        <section class="card">
            <h2>Проверьте данные</h2><p class="card-meta">Ученик будет создан только после подтверждения.</p>
            <dl class="review-list">${populated.map(([key, label]) => `<div class="review-row"><dt>${label}</dt><dd>${escapeHtml(draft[key as keyof StudentDraft])}</dd></div>`).join('')}</dl>
            <div class="button-row"><button class="button button--secondary" type="button" data-back>Изменить</button><button class="button button--primary" type="button" data-confirm>Создать ученика</button></div>
        </section>`;
    container.querySelector<HTMLButtonElement>('[data-back]')?.addEventListener('click', () => renderNewStudent(container, draft));
    container.querySelector<HTMLButtonElement>('[data-confirm]')?.addEventListener('click', async (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        button.disabled = true;
        button.textContent = 'Создаю…';
        try {
            const client = await apiFetch<{ id: number; firstName: string | null; lastName: string | null }>('/clients', {
                method: 'POST', body: JSON.stringify(draft),
            });
            const name = [client.firstName, client.lastName].filter(Boolean).join(' ') || `Ученик #${client.id}`;
            container.innerHTML = `<section class="state-card"><span class="state-symbol" aria-hidden="true">✓</span><h2>Ученик создан</h2><p>${escapeHtml(name)} · ID ${client.id}</p><button class="button button--primary" type="button" data-another>Добавить ещё</button></section>`;
            container.querySelector<HTMLButtonElement>('[data-another]')?.addEventListener('click', () => renderNewStudent(container));
        } catch (error) {
            if (error instanceof ApiError && error.status === 400 && Object.keys(error.fieldErrors).length) {
                renderNewStudent(container, draft);
                for (const [field, messages] of Object.entries(error.fieldErrors)) {
                    const target = container.querySelector<HTMLElement>(`[data-error="${field}"]`);
                    if (target) target.textContent = messages[0] ?? '';
                }
                return;
            }
            renderFailure(container, error, () => renderConfirmation(container, draft));
        }
    });
};
