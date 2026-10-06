import { StateSchema } from '@/app/providers/StoreProvider';
import { RoleKey } from '@/entities/Role';
import { RoutePath } from '@/shared/config/routeConfig/routeConfig';
import { getSidebarItems } from './getSidebarItems';

const stateFor = (role: RoleKey) => ({
    user: { _inited: true, authData: { id: '1', username: 'denis', email: 'd@example.com', role } },
}) as StateSchema;

const companyChildPaths = (role: RoleKey) => (
    getSidebarItems(stateFor(role)).find((item) => item.path === RoutePath.company)?.children?.map((child) => child.path)
);

test('admin sees the notifications item in the company group', () => {
    expect(companyChildPaths(RoleKey.ADMIN)).toContain(RoutePath.notifications);
});

test('manager does not see the notifications item', () => {
    expect(companyChildPaths(RoleKey.MANAGER)).not.toContain(RoutePath.notifications);
    expect(companyChildPaths(RoleKey.MANAGER)).toContain(RoutePath.payment_reminders);
});
