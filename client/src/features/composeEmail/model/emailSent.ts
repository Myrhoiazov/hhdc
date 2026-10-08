// A letter can be sent from the header on any page. Screens that show mail listen for this
// to reload themselves; nobody else needs to know who is listening.
const EMAIL_SENT_EVENT = 'crm:email-sent';

export const announceEmailSent = (): void => { window.dispatchEvent(new Event(EMAIL_SENT_EVENT)); };

// Returns the function that stops listening.
export const onEmailSent = (listener: () => void): (() => void) => {
    window.addEventListener(EMAIL_SENT_EVENT, listener);
    return () => window.removeEventListener(EMAIL_SENT_EVENT, listener);
};
