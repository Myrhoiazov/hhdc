import { TeamPersonRole } from '@/entities/EventTeam';
import { formText } from '@/shared/lib/form/formText';

export const money = (form: FormData) => formText(form, 'amount').replace(',', '.');

export const readMember = (form: FormData) => ({
    personId: formText(form, 'personId'),
    roleTitle: formText(form, 'roleTitle'),
    duties: formText(form, 'duties') || null,
    personRole: formText(form, 'personRole') as TeamPersonRole,
    ...(money(form) ? { amount: money(form) } : {}),
});
