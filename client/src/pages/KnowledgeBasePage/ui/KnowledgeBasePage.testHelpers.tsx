// Shared render/fixture helpers for the KnowledgeBasePage.*.test.tsx suite. Split out of a single
// 457-line test file (per Skylos SKY-C304/SKY-Q301) into feature-scoped files that each still need
// the same store/router render wrapper and the one "pending document" fixture every test starts
// from. `jest.mock(...)` calls stay in each test file — Jest hoists them per-file, so they must be
// declared there, not here.
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import KnowledgeBasePage from './KnowledgeBasePage';

export const pendingDocument = {
    id: 'manual:abc', title: 'Прайс на занятия', sourceType: 'file', sourceUrl: 'file://price.md',
    status: 'PENDING', category: 'CLASSES', priority: 5, tags: ['цены'], chunkCount: 0,
    errorMessage: null, lastSyncedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01',
};

export function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <KnowledgeBasePage />
            </MemoryRouter>
        </Provider>,
    );
}
