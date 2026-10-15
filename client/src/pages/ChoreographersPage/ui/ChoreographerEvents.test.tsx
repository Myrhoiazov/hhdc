import {
    renderAt,
    ALL,
    answerChoreographerRequests,
    historyItem,
} from './ChoreographerPages.testHelpers';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
    assignChoreographerToEvent,
    listChoreographerHistory,
    updateChoreographerAssignment,
} from '@/entities/Choreographer';
import { listEvents } from '@/entities/Event';
import { groupByYear } from '../model/groupByYear';

answerChoreographerRequests();

test('the event history is grouped by year and shows the same assignment the event page links to', async () => {
    jest.mocked(listChoreographerHistory).mockResolvedValue([
        historyItem('a27', 'HHDC 2027', 2027, 'UPCOMING'),
        historyItem('a26', 'HHDC 2026', 2026, 'PAST'),
    ]);
    renderAt('/people/choreographers/person-1/events', ['choreographers.read']);

    const upcoming = await screen.findByRole('article', { name: 'HHDC 2027' });
    expect(screen.getByRole('region', { name: '2027' })).toContainElement(upcoming);
    expect(screen.getByRole('region', { name: '2026' })).toHaveTextContent('HHDC 2026');
    expect(upcoming).toHaveTextContent('Sessions: Heels Pro');
    expect(upcoming).toHaveTextContent('TIMING_UPCOMING');
    expect(screen.getByRole('link', { name: 'HHDC 2027' })).toHaveAttribute(
        'href',
        '/events/event-2027'
    );
    expect(screen.queryByRole('form', { name: 'Add to event' })).not.toBeInTheDocument();
});

test('a choreographer is added to an event they are not on yet, and logistics are updated in place', async () => {
    jest.mocked(listChoreographerHistory).mockResolvedValue([
        historyItem('a27', 'HHDC 2027', 2027, 'UPCOMING'),
    ]);
    jest.mocked(listEvents).mockResolvedValue({
        data: [
            { id: 'event-2027', name: 'HHDC 2027' },
            { id: 'event-2025', name: 'HHDC 2025' },
        ] as never,
        total: 2,
    });
    renderAt('/people/choreographers/person-1/events', ALL);

    await screen.findByRole('option', { name: 'HHDC 2025' });
    expect(screen.queryByRole('option', { name: 'HHDC 2027' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Event'), { target: { value: 'event-2025' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to event' }));
    await waitFor(() =>
        expect(assignChoreographerToEvent).toHaveBeenCalledWith('person-1', {
            eventId: 'event-2025',
            roleTitle: undefined,
            status: 'INVITED',
        })
    );

    fireEvent.change(screen.getByLabelText('Travel'), { target: { value: 'BOOKED' } });
    await waitFor(() =>
        expect(updateChoreographerAssignment).toHaveBeenCalledWith('person-1', 'a27', {
            travelStatus: 'BOOKED',
        })
    );
});

test('years are grouped newest first', () => {
    const groups = groupByYear([
        historyItem('a', 'A', 2025, 'PAST'),
        historyItem('b', 'B', 2027, 'UPCOMING'),
        historyItem('c', 'C', 2025, 'PAST'),
    ]);
    expect(groups.map(([year, items]) => [year, items.length])).toEqual([
        [2027, 1],
        [2025, 2],
    ]);
});
