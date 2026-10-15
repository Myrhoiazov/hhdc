import { AutomationInput } from '@/entities/Automation';

// The automation the form describes: one action, with the conditions and the settings of the
// action written as JSON. Text that is not JSON throws, and the form shows the error.
export const readAutomation = (form: FormData): AutomationInput => ({
    name: String(form.get('name')),
    triggerType: String(form.get('triggerType')),
    conditions: JSON.parse(String(form.get('conditions'))),
    actions: [
        { type: String(form.get('actionType')), config: JSON.parse(String(form.get('config'))) },
    ],
});
