import { fromPartial } from '@total-typescript/shoehorn';
import { SidebarItemType } from '../types/sidebar';
import { isSidebarPathActive } from './isSidebarPathActive';

const link = (path: string, children?: SidebarItemType[]) => fromPartial<SidebarItemType>({ path, text: path, children });

const items = [
    link('/'),
    link('/people'),
    link('/people/duplicates'),
    link('/settings', [link('/settings'), link('/settings/audit')]),
];

test('highlights only the most specific link when one route sits under two links', () => {
    expect(isSidebarPathActive('/people/duplicates', '/people/duplicates', items)).toBe(true);
    expect(isSidebarPathActive('/people', '/people/duplicates', items)).toBe(false);
});

test('keeps the parent link active on a nested route that has no link of its own', () => {
    expect(isSidebarPathActive('/people', '/people/42', items)).toBe(true);
    expect(isSidebarPathActive('/people/duplicates', '/people/42', items)).toBe(false);
});

test('applies the same rule to links inside a group', () => {
    expect(isSidebarPathActive('/settings/audit', '/settings/audit', items)).toBe(true);
    expect(isSidebarPathActive('/settings', '/settings/audit', items)).toBe(false);
    expect(isSidebarPathActive('/settings', '/settings', items)).toBe(true);
});

test('does not treat the dashboard link as a prefix of every route', () => {
    expect(isSidebarPathActive('/', '/people', items)).toBe(false);
    expect(isSidebarPathActive('/', '/', items)).toBe(true);
});

test('still matches a link that is missing from the menu list', () => {
    expect(isSidebarPathActive('/clients', '/clients/5', items)).toBe(true);
});
