import { StateSchema } from '@/app/providers/StoreProvider';
import { getSidebarItems } from './getSidebarItems';

const stateFor = (permissions: string[]): StateSchema => ({ user: { _inited: true, authData: { id: '1', name: 'Owner', email: 'owner@example.test', roles: ['OWNER'], permissions } }, ui: { scroll: {} } });
test('shows event CRM navigation without obsolete school or payment routes', () => {
    const items = getSidebarItems(stateFor([]));
    expect(items.map(item => item.path)).toEqual(['/', '/people', '/events', '/email', '/knowledge-base']);
});
test('settings links follow permissions', () => {
    const items = getSidebarItems(stateFor(['users.manage', 'audit.read']));
    expect(items.find(item => item.path === '/settings')?.children?.map(item => item.path)).toEqual(['/settings', '/settings/audit']);
});
test('V2 sections appear only with the matching permission', () => {
    const paths = (permissions: string[]) => getSidebarItems(stateFor(permissions)).map(item => item.path);
    expect(paths(['finance.read'])).toContain('/finance');
    expect(paths(['automation.read', 'ai.use'])).toEqual(expect.arrayContaining(['/automations', '/assistant']));
    expect(paths(['people.read'])).not.toContain('/finance');
});
test('notification settings are offered to staff who manage settings', () => {
    const items = getSidebarItems(stateFor(['settings.manage']));
    expect(items.find(item => item.path === '/settings')?.children?.map(item => item.path)).toEqual(['/settings/platform', '/settings/notifications']);
});
