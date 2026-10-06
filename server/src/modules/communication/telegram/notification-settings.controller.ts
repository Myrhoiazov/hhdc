import { z } from 'zod';
import type { Request, Response } from 'express';
import {
    isTelegramNotificationKey,
    listTelegramNotificationSettings,
    setTelegramNotificationEnabled,
} from './notification-settings.service';
import { notifyNotificationSettingChanged } from './telegram.service';

export const updateTelegramNotificationSettingSchema = z.object({ enabled: z.boolean() }).strict();

export const listTelegramNotificationSettingsController = async (_req: Request, res: Response) => (
    res.json({ items: await listTelegramNotificationSettings() })
);

// Fire-and-forget: the setting is already saved, a failed Telegram send must not fail the request.
const announceSettingChange = (title: string, enabled: boolean, actorEmail?: string | null) => {
    void notifyNotificationSettingChanged({ title, enabled, actorEmail })
        .catch((error) => console.error('Failed to send notification-setting-changed Telegram notification:', error));
};

export const updateTelegramNotificationSettingController = async (req: Request, res: Response) => {
    const { key } = req.params;
    if (!isTelegramNotificationKey(key)) return res.status(404).json({ message: 'Unknown notification' });

    const parsed = updateTelegramNotificationSettingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid notification setting' });

    const { setting, changed } = await setTelegramNotificationEnabled({
        key,
        enabled: parsed.data.enabled,
        updatedById: req.user?.id,
    });
    if (changed) announceSettingChange(setting.title, setting.enabled, req.user?.email);

    return res.json(setting);
};
