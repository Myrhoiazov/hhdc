import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';

// Flags gate risky/new modules. They are rollout switches, not permission controls.
export const KNOWN_FLAGS = ['ai_actions', 'campaigns', 'refund_execution', 'new_checkin'] as const;
export type FeatureFlagKey = typeof KNOWN_FLAGS[number];

export const isFeatureEnabled = async (key: FeatureFlagKey) =>
    Boolean((await prisma.featureFlag.findUnique({ where: { key } }))?.enabled);

export const assertFeatureEnabled = async (key: FeatureFlagKey) => {
    if (!(await isFeatureEnabled(key))) throw new ApiError(409, 'FEATURE_DISABLED', `Feature ${key} is disabled. Enable it in Settings → Feature flags.`);
};
