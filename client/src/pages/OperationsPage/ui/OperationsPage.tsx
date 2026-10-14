import { memo } from 'react';
import { CrmLayout } from '@/widgets/Page';
import { HealthPanel } from './HealthPanel';
import { TasksPanel } from './TasksPanel';
import { CheckinPanel } from './CheckinPanel';

export const OperationsPage = memo(() => (
    <CrmLayout title="Operations">
        <CheckinPanel />
        <TasksPanel />
        <HealthPanel />
    </CrmLayout>
));
