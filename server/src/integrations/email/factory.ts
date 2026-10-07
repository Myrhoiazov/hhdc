import type { EmailProvider } from './EmailProvider';
import { GmailEmailProvider } from './gmail';
import { ImapEmailProvider } from './imap';

export interface EmailConnectionConfig {
    provider: string;
    credentials: Record<string, string>;
    settings: unknown;
}

type EmailProviderBuilder = (config: EmailConnectionConfig) => EmailProvider;

const BUILDERS: Record<string, EmailProviderBuilder> = {
    GMAIL: config => new GmailEmailProvider(config.credentials),
    IMAP: config => new ImapEmailProvider({ credentials: config.credentials, settings: config.settings }),
};

export const isEmailProviderName = (provider: string): boolean => provider in BUILDERS;

export const createEmailProvider = (config: EmailConnectionConfig): EmailProvider => {
    const build = BUILDERS[config.provider];
    if (!build) throw new Error(`Unsupported email provider: ${config.provider}`);
    return build(config);
};
