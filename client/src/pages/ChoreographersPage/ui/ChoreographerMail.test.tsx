import { renderAt, ALL, answerChoreographerRequests } from './ChoreographerPages.testHelpers';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
    ChoreographerThread,
    linkChoreographerThread,
    listChoreographerActivity,
    listChoreographerThreads,
    unlinkChoreographerThread,
} from '@/entities/Choreographer';
import { listConversations } from '@/entities/Conversation';

answerChoreographerRequests();

const thread = (overrides: Partial<ChoreographerThread>): ChoreographerThread => ({
    id: 'thread-1',
    subject: 'Fee for 2027',
    status: 'OPEN',
    lastMessageAt: '2026-10-01T10:00:00.000Z',
    event: null,
    person: { id: 'person-1', displayName: 'Joanna Gomez', email: 'jojo@example.test' },
    latestMessage: {
        direction: 'INBOUND',
        sender: 'jojo@example.test',
        recipient: 'info@hhdc.test',
        preview: 'Can we talk about the fee?',
        createdAt: '2026-10-01T10:00:00.000Z',
    },
    provenance: 'direct_person_email',
    link: null,
    ...overrides,
});
const managerThread = thread({
    id: 'thread-2',
    subject: 'Agency: 2027 terms',
    provenance: 'manual_link',
    person: { id: 'person-m', displayName: 'Sam Lee', email: 'sam@agency.test' },
    link: { id: 'link-1', note: 'Sam wrote about Jojo', createdAt: '2026-10-02T10:00:00.000Z' },
});
const MAIL = [
    ...ALL,
    'choreographers.conversations.read',
    'choreographers.conversations.link',
    'choreographers.activity.read',
];

test('emails show why each conversation is on the profile; only a hand-made link can be removed', async () => {
    jest.mocked(listChoreographerThreads).mockResolvedValue({
        data: [thread({}), managerThread],
        candidates: [],
        total: 2,
    });
    jest.spyOn(window, 'prompt').mockReturnValue('It was about another choreographer');
    renderAt('/people/choreographers/person-1/emails', MAIL);

    const own = await screen.findByRole('article', { name: 'Fee for 2027' });
    expect(own).toHaveTextContent('PROVENANCE_direct_person_email');
    expect(own).toHaveTextContent('Can we talk about the fee?');
    const linked = screen.getByRole('article', { name: 'Agency: 2027 terms' });
    expect(linked).toHaveTextContent('PROVENANCE_manual_link');
    expect(linked).toHaveTextContent('Reason for the link: Sam wrote about Jojo');
    expect(screen.queryByRole('button', { name: 'Unlink: Fee for 2027' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unlink: Agency: 2027 terms' }));

    await waitFor(() =>
        expect(unlinkChoreographerThread).toHaveBeenCalledWith(
            'person-1',
            'thread-2',
            'It was about another choreographer'
        )
    );
});

test('a conversation is linked only by choice and with a reason', async () => {
    jest.mocked(listChoreographerThreads).mockResolvedValue({
        data: [],
        candidates: [thread({ id: 'thread-9', subject: 'From my private mail', person: null })],
        total: 0,
    });
    jest.mocked(listConversations).mockResolvedValue({
        data: [{ id: 'thread-2', subject: 'Agency: 2027 terms', status: 'OPEN' }] as never,
        total: 1,
    });
    renderAt('/people/choreographers/person-1/emails', MAIL);

    const form = await screen.findByRole('form', { name: 'Link conversation' });
    expect(await screen.findByRole('option', { name: 'From my private mail' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Find conversation'), { target: { value: 'agency' } });
    await screen.findByRole('option', { name: 'Agency: 2027 terms' });
    fireEvent.change(screen.getByLabelText('Conversation'), { target: { value: 'thread-2' } });
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent(
        'Choose a conversation and say why it belongs here'
    );
    expect(linkChoreographerThread).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Conversation'), { target: { value: 'thread-2' } });
    fireEvent.change(screen.getByLabelText('Reason for the link'), {
        target: { value: 'Sam wrote about Jojo' },
    });
    fireEvent.submit(form);
    await waitFor(() =>
        expect(linkChoreographerThread).toHaveBeenCalledWith(
            'person-1',
            'thread-2',
            'Sam wrote about Jojo'
        )
    );
});

test('without the link permission the emails are read-only', async () => {
    jest.mocked(listChoreographerThreads).mockResolvedValue({
        data: [managerThread],
        candidates: [],
        total: 1,
    });
    renderAt('/people/choreographers/person-1/emails', [
        ...ALL,
        'choreographers.conversations.read',
    ]);

    await screen.findByRole('article', { name: 'Agency: 2027 terms' });
    expect(screen.queryByRole('button', { name: /Unlink/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Link conversation' })).not.toBeInTheDocument();
});

test('the activity timeline pages backwards and filters by kind', async () => {
    const entry = (id: string, type: string, createdAt: string) => ({
        id,
        type,
        entityType: 'ChoreographerProfile',
        createdAt,
        actor: 'Denis',
        event: null,
    });
    jest.mocked(listChoreographerActivity).mockImplementation(async (_personId, filters) =>
        filters?.before
            ? {
                  data: [entry('a1', 'CHOREOGRAPHER_PROFILE_CREATED', '2026-09-01T10:00:00.000Z')],
                  nextBefore: null,
              }
            : {
                  data: [entry('a2', 'CHOREOGRAPHER_PHOTO_ADDED', '2026-10-01T10:00:00.000Z')],
                  nextBefore: '2026-10-01T10:00:00.000Z',
              }
    );
    renderAt('/people/choreographers/person-1/activity', MAIL);

    const timeline = await screen.findByRole('region', { name: 'Activity' });
    await waitFor(() => expect(timeline.querySelectorAll('li')).toHaveLength(1));
    expect(timeline).toHaveTextContent('Denis');
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(timeline.querySelectorAll('li')).toHaveLength(2));
    expect(listChoreographerActivity).toHaveBeenLastCalledWith('person-1', {
        type: undefined,
        before: '2026-10-01T10:00:00.000Z',
    });

    fireEvent.change(screen.getByLabelText('Show'), { target: { value: 'CHOREOGRAPHER_PHOTO' } });
    await waitFor(() =>
        expect(listChoreographerActivity).toHaveBeenLastCalledWith('person-1', {
            type: 'CHOREOGRAPHER_PHOTO',
            before: undefined,
        })
    );
});
