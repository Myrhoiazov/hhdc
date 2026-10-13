export interface FeatureFlag {
    key: string;
    enabled: boolean;
}

export interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    status: string;
    permissions: string[];
    key?: string;
}

export interface WebhookEndpoint {
    id: string;
    name: string;
    url: string;
    status: string;
    events: string[];
    secret?: string;
}
