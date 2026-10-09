// A link into the CRM for a message; empty when the address of the CRM is not configured.
export const crmLink = (path: string, env: NodeJS.ProcessEnv = process.env): string => {
    const base = (env.CLIENT_URL ?? '').replace(/\/$/, '');
    return base ? `${base}${path}` : '';
};
