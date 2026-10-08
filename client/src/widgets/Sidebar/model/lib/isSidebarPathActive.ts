import { SidebarItemType } from '../types/sidebar';

const matchesPath = (path: string, pathname: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

const collectLinkPaths = (items: SidebarItemType[]): string[] =>
    items.flatMap((item) => (item.children?.length ? collectLinkPaths(item.children) : [item.path]));

// A route can sit under several menu links at once (/people/duplicates is under /people too).
// Only the most specific link counts as active, so exactly one item is highlighted.
export const isSidebarPathActive = (path: string, pathname: string, items: SidebarItemType[]) => {
    if (!matchesPath(path, pathname)) {
        return false;
    }

    return !collectLinkPaths(items).some(
        (other) => other.length > path.length && matchesPath(other, pathname),
    );
};
