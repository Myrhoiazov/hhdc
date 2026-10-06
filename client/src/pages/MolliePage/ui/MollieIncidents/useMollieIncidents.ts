import { useIncidentsList } from './useIncidentsList';
import { useIncidentActions } from './useIncidentActions';

export type {
    IncidentTypeFilter, IncidentCustomer, MollieIncident, IncidentFilters,
} from './mollieIncidentTypes';
export { defaultFilters } from './mollieIncidentTypes';

export const useMollieIncidents = () => {
    const list = useIncidentsList();
    const actions = useIncidentActions(list.filters, list.page, list.loadIncidents);

    return {
        ...list,
        ...actions,
    };
};
