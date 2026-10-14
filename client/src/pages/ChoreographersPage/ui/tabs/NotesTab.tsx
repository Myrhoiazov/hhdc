import { memo } from 'react';
import { NotesSection } from './NotesSection';
import { TasksSection } from './TasksSection';

export interface NotesTabProps {
    personId: string;
    canManageNotes: boolean;
    canReadTasks: boolean;
    canManageTasks: boolean;
}

export const NotesTab = memo(
    ({ personId, canManageNotes, canReadTasks, canManageTasks }: NotesTabProps) => (
        <>
            <NotesSection personId={personId} canManage={canManageNotes} />
            {canReadTasks && <TasksSection personId={personId} canManage={canManageTasks} />}
        </>
    )
);
