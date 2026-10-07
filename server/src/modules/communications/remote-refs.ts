import { z } from 'zod';
import type { RemoteEmailRef } from '../../integrations/email/EmailProvider';

export interface ProviderLinkedMessage {
    direction: string;
    providerConnectionId: string | null;
    externalId: string | null;
    rawData: unknown;
}

const remoteMetadata = z.object({
    threadId: z.string().optional(),
    providerRef: z.string().optional(),
}).passthrough();

// Groups the incoming messages by the mailbox that holds them; only those can be changed remotely.
export const groupRemoteMessages = <T extends ProviderLinkedMessage>(messages: T[]): Map<string, RemoteEmailRef[]> => {
    const groups = new Map<string, RemoteEmailRef[]>();
    for (const message of messages) {
        if (message.direction !== 'INBOUND' || !message.providerConnectionId || !message.externalId) continue;
        const metadata = remoteMetadata.safeParse(message.rawData ?? {});
        const ref = { externalId: message.externalId, ...(metadata.success ? metadata.data : {}) };
        groups.set(message.providerConnectionId, [...(groups.get(message.providerConnectionId) ?? []), ref]);
    }
    return groups;
};