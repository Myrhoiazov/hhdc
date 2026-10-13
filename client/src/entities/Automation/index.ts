export {
    getAutomationMeta,
    listAutomations,
    createAutomation,
    setAutomationStatus,
    testAutomation,
    listAutomationRuns,
} from './api/automationApi';
export type {
    AutomationActionRun,
    AutomationRun,
    Automation,
    AutomationInput,
    AutomationTest,
} from './model/types';
