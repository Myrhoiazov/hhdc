import { createSelector } from '@reduxjs/toolkit';
import { getUserAuthData } from '@/entities/User';
import { RoutePath } from '@/shared/config/routeConfig/routeConfig';
import Main from '@/shared/assets/icons/main.svg';
import People from '@/shared/assets/icons/clients.svg';
import Events from '@/shared/assets/icons/calendar-20-20.svg';
import Mail from '@/shared/assets/icons/mail-20-20.svg';
import Knowledge from '@/shared/assets/icons/content-hub.svg';
import Euro from '@/shared/assets/icons/euro.svg';
import Check from '@/shared/assets/icons/check.svg';
import Settings from '@/shared/assets/icons/crm-settings.svg';
import { SidebarItemType } from '../types/sidebar';

export const getSidebarItems = createSelector(getUserAuthData, (user) => {
    const items: SidebarItemType[] = [
        { path: RoutePath.main, Icon: Main, text: 'Dashboard' },
        { path: RoutePath.people, Icon: People, text: 'People' },
        { path: RoutePath.events, Icon: Events, text: 'Events', iconColor: 'stroke' },
        { path: RoutePath.email, Icon: Mail, text: 'Communications' },
        { path: RoutePath.knowledge_base, Icon: Knowledge, text: 'AI & Knowledge', iconColor: 'stroke' },
    ];
    const permissions = user?.permissions || [];
    // V2 sections appear only for staff who hold the matching permission.
    const gated: [string, SidebarItemType][] = [
        ['people.write', { path: RoutePath.duplicates, Icon: People, text: 'Duplicates' }],
        ['campaigns.read', { path: RoutePath.campaigns, Icon: Mail, text: 'Campaigns' }],
        ['automation.read', { path: RoutePath.automations, Icon: Settings, text: 'Automations', iconColor: 'stroke' }],
        ['finance.read', { path: RoutePath.finance, Icon: Euro, text: 'Finance', iconColor: 'stroke' }],
        ['ai.use', { path: RoutePath.assistant, Icon: Knowledge, text: 'AI Assistant', iconColor: 'stroke' }],
        ['operations.read', { path: RoutePath.operations, Icon: Check, text: 'Operations', iconColor: 'stroke' }],
    ];
    items.push(...gated.filter(([permission]) => permissions.includes(permission)).map(([, item]) => item));
    const children: SidebarItemType[] = [];
    if (permissions.includes('users.manage')) children.push({ path: RoutePath.settings, Icon: People, text: 'Users & Roles' });
    if (permissions.includes('providers.read')) children.push({ path: RoutePath.providers, Icon: Settings, text: 'Providers', iconColor: 'stroke' });
    if (permissions.includes('settings.manage')) children.push({ path: RoutePath.platform, Icon: Settings, text: 'Platform', iconColor: 'stroke' });
    if (permissions.includes('audit.read')) children.push({ path: RoutePath.audit, Icon: Settings, text: 'Audit log', iconColor: 'stroke' });
    if (children.length) items.push({ path: '/settings', Icon: Settings, text: 'Settings', children, iconColor: 'stroke' });
    return items;
});
