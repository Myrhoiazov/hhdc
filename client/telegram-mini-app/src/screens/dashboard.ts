import { apiFetch } from '../api';
import { renderFailure } from '../ui';

interface DashboardSummary {
    paidThisMonth: number;
    monthlyRevenue: number;
    activeSubscriptions: number;
    failedPayments: number;
}

export const renderDashboard = async (container: HTMLElement): Promise<void> => {
    container.innerHTML = '<div class="metric-grid" aria-label="Загрузка"><div class="metric-card skeleton"></div><div class="metric-card skeleton"></div><div class="metric-card skeleton"></div><div class="metric-card skeleton"></div></div>';
    try {
        const [summary, countResult] = await Promise.all([
            apiFetch<DashboardSummary>('/mollie/dashboard/summary'),
            apiFetch<{ count: number }>('/clients/count'),
        ]);
        const money = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(summary.monthlyRevenue);
        container.innerHTML = `
            <div class="section-heading"><div><h2>Сегодня в DDC</h2><p>Основные показатели школы</p></div></div>
            <section class="metric-grid" aria-label="Показатели DDC">
                <article class="metric-card"><span class="metric-label">Ученики</span><strong class="metric-value">${countResult.count}</strong></article>
                <article class="metric-card"><span class="metric-label">Платежи в этом месяце</span><strong class="metric-value">${summary.paidThisMonth}</strong></article>
                <article class="metric-card"><span class="metric-label">Выручка за месяц</span><strong class="metric-value">${money}</strong></article>
                <article class="metric-card"><span class="metric-label">Активные подписки</span><strong class="metric-value">${summary.activeSubscriptions}</strong></article>
                <article class="metric-card metric-card--wide ${summary.failedPayments > 0 ? 'metric-card--warning' : ''}"><span class="metric-label">Проблемные платежи</span><strong class="metric-value">${summary.failedPayments}</strong></article>
            </section>`;
    } catch (error) {
        renderFailure(container, error, () => void renderDashboard(container));
    }
};
