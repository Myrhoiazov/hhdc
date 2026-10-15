import { readCheckIn } from './readCheckIn';

test('a check-in is a ticket code and the event it is checked at', () => {
    const form = new FormData();
    form.set('code', 'HHDC-123');
    form.set('eventId', 'e1');

    expect(readCheckIn(form)).toEqual({ code: 'HHDC-123', eventId: 'e1' });
});
