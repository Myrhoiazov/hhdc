export interface ChoreographerActivityItem {
    id: string;
    type: string;
    entityType: string;
    createdAt: string;
    actor: string | null;
    event: { id: string; name: string } | null;
}

export interface ChoreographerActivityPage {
    data: ChoreographerActivityItem[];
    nextBefore: string | null;
}
