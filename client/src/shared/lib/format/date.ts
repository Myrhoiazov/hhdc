type DateValue = string | number | Date;

// Dates the way the browser of the reader writes them. `options` names the parts to show.
export const formatDate = (value: DateValue, options?: Intl.DateTimeFormatOptions) =>
    new Date(value).toLocaleDateString(undefined, options);

export const formatDateTime = (value: DateValue) => new Date(value).toLocaleString();

export const formatTime = (value: DateValue) => new Date(value).toLocaleTimeString();

// A date written out with a short month name, e.g. "5 Mar 2026".
export const formatLongDate = (value: DateValue) =>
    formatDate(value, { day: 'numeric', month: 'short', year: 'numeric' });
