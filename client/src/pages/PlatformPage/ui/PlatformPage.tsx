import { memo } from 'react';
import { CrmLayout } from '@/widgets/Page';
import { FlagsPanel } from './FlagsPanel';
import { ApiKeysPanel } from './ApiKeysPanel';
import { WebhooksPanel } from './WebhooksPanel';

export const PlatformPage = memo(() => (
    <CrmLayout title="Platform settings">
        <FlagsPanel />
        <ApiKeysPanel />
        <WebhooksPanel />
    </CrmLayout>
));
