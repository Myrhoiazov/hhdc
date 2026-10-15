export interface AuditEntry {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    ipAddress: string | null;
    createdAt: string;
    actor: { id: string; name: string; email: string } | null;
}

export interface AuditFilters {
    q: string;
    entityType: string;
    actorUserId: string;
    from: string;
    to: string;
}

export interface AuditOptions {
    entityTypes: string[];
    actors: { id: string; name: string; email: string }[];
}
