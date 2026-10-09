// Something counts as news for a day. Mail imported from the history of a mailbox and orders
// read from the history of a ticket shop are older than that and are not announced.
export const NEWS_WINDOW_MS = 24 * 60 * 60_000;

export const happenedRecently = (at: unknown, now: number = Date.now()): boolean => {
    const moment = at instanceof Date ? at.getTime() : typeof at === 'string' ? Date.parse(at) : Number.NaN;
    return !Number.isNaN(moment) && now - moment <= NEWS_WINDOW_MS;
};
