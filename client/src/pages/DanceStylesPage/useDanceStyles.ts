import { useDanceStylesList } from './useDanceStylesList';
import { useDanceStyleForm } from './useDanceStyleForm';
import { useDanceStyleActions } from './useDanceStyleActions';

export type { DanceStyle, Lang, StyleForm } from './danceStyleTypes';
export { langFields } from './danceStyleTypes';

export const useDanceStyles = () => {
    const list = useDanceStylesList();
    const form = useDanceStyleForm(list.loadStyles);
    const actions = useDanceStyleActions(list.loadStyles);

    return {
        ...list,
        ...form,
        ...actions,
    };
};
