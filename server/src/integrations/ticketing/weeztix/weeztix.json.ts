import { ApiError } from '../../../common/http';

// Reading untyped answers of Weeztix without trusting their shape.

export const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
export const record = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? value as Record<string, unknown> : {});
export const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

// The reason comes from the provider's answer and never includes the request, which holds the token.
export const failureReason = async (response: Response): Promise<string> => {
    const body = record(await response.json().catch((): null => null));
    return (text(body.error_description) || `HTTP ${response.status}`).slice(0, 200);
};

// Weeztix warns that its API will change. An answer in a shape the CRM does not know is refused
// loudly, so a sync fails visibly instead of quietly saving less than there is.
export class WeeztixFormatError extends ApiError {
    constructor(what: string) {
        super(502, 'WEEZTIX_FORMAT_CHANGED', `Weeztix answered in a format the CRM does not know (${what}). The integration needs an update`);
    }
}

export const expectList = (value: unknown, what: string): unknown[] => {
    if (!Array.isArray(value)) throw new WeeztixFormatError(what);
    return value;
};

// A retired endpoint answers with status 299 and no data.
const DEPRECATED = 299;
export const expectData = async (response: Response, what: string): Promise<unknown> => {
    if (!response.ok) throw new ApiError(502, 'WEEZTIX_UNAVAILABLE', `Weeztix did not return ${what}: ${await failureReason(response)}`);
    if (response.status === DEPRECATED) throw new WeeztixFormatError(`${what}: the endpoint is retired`);
    return response.json().catch((): never => { throw new WeeztixFormatError(what); });
};

export interface WeeztixAccess { accessToken: string; companyGuid: string }

export const accessHeaders = (access: WeeztixAccess): Record<string, string> => ({
    Authorization: `Bearer ${access.accessToken}`, Company: access.companyGuid, Accept: 'application/json',
});
