import { useCallback, useMemo, useState } from 'react';
import { Conversation } from '@/entities/crm';

const NOTHING: ReadonlySet<string> = new Set();

export interface ConversationSelection {
    selectedIds: string[];
    allSelected: boolean;
    toggle: (id: string) => void;
    toggleAll: () => void;
    clear: () => void;
    keepOnly: (ids: string[]) => void;
}

const withToggled = (chosen: ReadonlySet<string>, id: string): ReadonlySet<string> => {
    const next = new Set(chosen);
    if (!next.delete(id)) next.add(id);
    return next;
};

export const useConversationSelection = (conversations: Conversation[]): ConversationSelection => {
    const [chosen, setChosen] = useState(NOTHING);
    // Only loaded conversations count: one that left the list drops out of the selection by itself.
    const selectedIds = useMemo(
        () => conversations.filter((conversation) => chosen.has(conversation.id)).map((conversation) => conversation.id),
        [conversations, chosen],
    );
    const allSelected = conversations.length > 0 && selectedIds.length === conversations.length;
    const toggle = useCallback((id: string) => setChosen((previous) => withToggled(previous, id)), []);
    const toggleAll = useCallback(
        () => setChosen(allSelected ? NOTHING : new Set(conversations.map((conversation) => conversation.id))),
        [allSelected, conversations],
    );
    const clear = useCallback(() => setChosen(NOTHING), []);
    const keepOnly = useCallback((ids: string[]) => setChosen(new Set(ids)), []);
    return { selectedIds, allSelected, toggle, toggleAll, clear, keepOnly };
};
