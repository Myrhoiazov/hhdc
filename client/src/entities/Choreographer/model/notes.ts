// Internal notes: staff only, never shown outside the CRM.
export interface ChoreographerNote {
    id: string;
    content: string;
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
    createdByName: string | null;
}

// Follow-ups are ordinary tasks tied to the choreographer; they also show up in Operations.
export const TASK_PRIORITIES = ['LOW', 'NORMAL', 'HIGH'] as const;

export interface ChoreographerTask {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: string | null;
    assignee: { id: string; name: string } | null;
}
