import { lookup } from 'node:dns/promises';

export type DnsLookup = (hostname: string, options: { all: true }) => Promise<Array<{ address: string; family: number }>>;

export type UnsafeKnowledgeUrlReason = 'invalid_url' | 'unsupported_protocol' | 'credentials_in_url' | 'private_address';
// Flat (non-discriminated-union) shape on purpose: this codebase's server tsconfig has no
// strictNullChecks, under which TS does not reliably narrow `if (!result.safe)` on a
// `{safe:true;url}|{safe:false;reason}` union — callers would need an `in` check or a cast to
// reach `.reason`/`.url` safely. `url`/`reason` are simply both optional instead.
export interface PublicHttpUrlCheck {
    safe: boolean;
    url?: URL;
    reason?: UnsafeKnowledgeUrlReason;
}

const isPrivateIPv4 = (address: string): boolean => {
    const parts = address.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast (224-239) and reserved (240-255)
    return false;
};

const isPrivateIPv6 = (address: string): boolean => {
    const normalized = address.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('::ffff:')) return isPrivateIPv4(normalized.slice(7));
    const firstGroup = normalized.split(':')[0];
    // fe80::/10 (link-local) and fc00::/7 (unique local, fc.. and fd..)
    if (firstGroup.startsWith('fe8') || firstGroup.startsWith('fe9') || firstGroup.startsWith('fea') || firstGroup.startsWith('feb')) return true;
    if (firstGroup.startsWith('fc') || firstGroup.startsWith('fd')) return true;
    return false;
};

const isPrivateAddress = (address: string): boolean => (address.includes(':') ? isPrivateIPv6(address) : isPrivateIPv4(address));

const isIpLiteral = (hostname: string): boolean => /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');

// Guards a manually-pasted admin URL against SSRF: rejects non-http(s) protocols and resolves the
// hostname (catching DNS rebinding, not just literal IPs) to reject loopback/private/link-local/
// multicast targets. Independent of isAllowedKnowledgeUrl's domain allowlist, which only applies
// to the pre-configured WordPress/sitemap sources, not an arbitrary admin-supplied URL.
export const checkPublicHttpUrl = async (value: string, dnsLookup: DnsLookup = lookup): Promise<PublicHttpUrlCheck> => {
    let url: URL;
    try { url = new URL(value); } catch { return { safe: false, reason: 'invalid_url' }; }
    if (!['http:', 'https:'].includes(url.protocol)) return { safe: false, reason: 'unsupported_protocol' };
    if (url.username || url.password) return { safe: false, reason: 'credentials_in_url' };
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (hostname.toLowerCase() === 'localhost') return { safe: false, reason: 'private_address' };
    let addresses: Array<{ address: string }>;
    try {
        addresses = isIpLiteral(hostname) ? [{ address: hostname }] : await dnsLookup(hostname, { all: true });
    } catch {
        return { safe: false, reason: 'private_address' };
    }
    if (!addresses.length || addresses.some((candidate) => isPrivateAddress(candidate.address))) {
        return { safe: false, reason: 'private_address' };
    }
    return { safe: true, url };
};
