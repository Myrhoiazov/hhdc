// The ticket code that is checked in and the event it is checked in at.
export const readCheckIn = (form: FormData) => ({
    code: String(form.get('code')),
    eventId: String(form.get('eventId')),
});
