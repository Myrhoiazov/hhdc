import { Router } from 'express';
import { route } from '../../common/http';
import { currentUser, permitted } from '../auth/auth.middleware';
import { createAuditLog, extractAuditContext } from '../audit/audit.service';
import { announceSettingChange, listNotificationSettings, notificationChangeSchema, notificationKeySchema, setNotificationEnabled } from './settings';

export const telegramNotificationsRouter = Router();

telegramNotificationsRouter.get('/', permitted('settings.manage'), route(async () => listNotificationSettings()));

// The switch is saved first; the chat is told afterwards and a failed message does not undo it.
telegramNotificationsRouter.put('/:key', permitted('settings.manage'), route(async req => {
    const key = notificationKeySchema.parse(req.params.key);
    const { enabled } = notificationChangeSchema.parse(req.body);
    const actor = currentUser(req);
    const { setting, changed } = await setNotificationEnabled({ key, enabled, actorUserId: actor.id });
    if (changed) {
        await createAuditLog({ action: 'NOTIFICATION_SETTING_CHANGED', entityType: 'TelegramNotificationSetting', before: { key, enabled: !enabled }, after: { key, enabled } }, extractAuditContext(req));
        void announceSettingChange(setting, actor.name || actor.email);
    }
    return setting;
}));
