export interface OperationsHealth {
    failedJobs: number;
    failedOutbox: number;
    pendingOutbox: number;
    failedWebhooks: number;
    failedAutomationRuns: number;
    providers: { id: string; name: string; status: string; lastError?: string | null }[];
}

export interface Task {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string | null;
}

export interface CheckinResult {
    registration: {
        id: string;
        person: { displayName: string };
        event: { name: string };
        ticket?: { ticketType: string } | null;
    };
    checkedInAt: string;
}
