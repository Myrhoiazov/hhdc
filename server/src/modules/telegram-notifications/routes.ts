import { Router } from 'express';
import { route } from '../../common/http';
import { currentUser, permitted } from '../auth/auth.middleware';
import { createAuditLog, extractAuditContext } from '../audit/audit.service';
import { announceSettingChange, changeNotification, listNotificationSettings, notificationChangeSchema, notificationKeySchema, sendTestNotification } from './settings';

export const telegramNotificationsRouter = Router();

telegramNotificationsRouter.get('/', permitted('settings.manage'), route(async () => listNotificationSettings()));

// The change is saved first; the chat is told about a switch afterwards and a failed message
// does not undo it. A new text is not announced: the test button shows it on request.
telegramNotificationsRouter.put('/:key', permitted('settings.manage'), route(async req => {
    const key = notificationKeySchema.parse(req.params.key);
    const change = notificationChangeSchema.parse(req.body);
    const actor = currentUser(req);
    const { setting, switched, rewritten, before } = await changeNotification({ key, ...change, actorUserId: actor.id });
    const after = { key, enabled: setting.enabled, template: setting.customised ? setting.template : null };
    const record = (action: string) => createAuditLog({ action, entityType: 'TelegramNotificationSetting', before: { key, ...before }, after }, extractAuditContext(req));
    if (switched) await record('NOTIFICATION_SETTING_CHANGED');
    if (rewritten) await record('NOTIFICATION_TEXT_CHANGED');
    if (switched) void announceSettingChange(setting, actor.name || actor.email);
    return setting;
}));

telegramNotificationsRouter.post('/:key/test', permitted('settings.manage'), route(async req => sendTestNotification(notificationKeySchema.parse(req.params.key))));
