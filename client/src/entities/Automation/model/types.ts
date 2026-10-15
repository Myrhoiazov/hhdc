export interface AutomationActionRun {
    id: string;
    status: string;
    error?: string | null;
    input: { type?: string };
}

export interface AutomationRun {
    id: string;
    status: string;
    dryRun: boolean;
    startedAt: string;
    error?: string | null;
    actionRuns: AutomationActionRun[];
}

export interface Automation {
    id: string;
    name: string;
    status: string;
    triggerType: string;
    actions: { id: string; type: string }[];
}

export interface AutomationInput {
    name: string;
    triggerType: string;
    conditions: unknown;
    actions: { type: string; config: unknown }[];
}

export interface AutomationTest {
    matched: boolean;
    run: AutomationRun | null;
    recentTriggerEvents: number;
    sideEffects: string[];
}
