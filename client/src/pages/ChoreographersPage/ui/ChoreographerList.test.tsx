import {
    person,
    profile,
    summary,
    detail,
    renderAt,
    ALL,
    answerChoreographerRequests,
} from './ChoreographerPages.testHelpers';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
    createChoreographer,
    fetchChoreographerPhoto,
    getChoreographer,
    listChoreographers,
} from '@/entities/Choreographer';
import { listPeople } from '@/entities/Person';

answerChoreographerRequests();

test('the list shows stage name, legal name and collaboration summary, and filters by relationship', async () => {
    renderAt('/people/choreographers', ['choreographers.read']);

    const link = await screen.findByRole('link', { name: 'Jojo Gomez' });
    expect(link).toHaveAttribute('href', '/people/choreographers/person-1');
    expect(screen.getByText('Joanna Gomez')).toBeInTheDocument();
    expect(screen.getByText('Events: 2')).toBeInTheDocument();
    expect(screen.getByText('Last event: 2026')).toBeInTheDocument();
    expect(screen.getByText('Upcoming: HHDC 2027')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Relationship'), { target: { value: 'NEGOTIATING' } });

    await waitFor(() =>
        expect(listChoreographers).toHaveBeenLastCalledWith(
            { q: '', relationshipStatus: 'NEGOTIATING' },
            1
        )
    );
    expect(screen.queryByRole('region', { name: 'Add choreographer' })).not.toBeInTheDocument();
});

test('a choreographer is created from an existing contact, never as a new person', async () => {
    jest.mocked(listPeople).mockImplementation(async (search) =>
        search === 'ali'
            ? {
                  data: [
                      {
                          id: 'person-2',
                          firstName: 'Aliya',
                          lastName: 'Janell',
                          displayName: 'Aliya Janell',
                          email: 'aliya@example.test',
                          status: 'ACTIVE',
                          roles: [],
                      },
                  ],
                  total: 1,
              }
            : { data: [], total: 0 }
    );
    renderAt('/people/choreographers', ['choreographers.read', 'choreographers.create']);

    fireEvent.change(await screen.findByLabelText('Find contact'), { target: { value: 'ali' } });
    await screen.findByRole('option', { name: 'Aliya Janell · aliya@example.test' });
    fireEvent.change(screen.getByLabelText('Contact'), { target: { value: 'person-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create choreographer profile' }));

    await waitFor(() => expect(createChoreographer).toHaveBeenCalledWith('person-2'));
});

test('the cover photo is shown in the profile header and in the list', async () => {
    jest.mocked(getChoreographer).mockResolvedValue({ ...detail, coverPhotoId: 'p1' });
    jest.mocked(listChoreographers).mockResolvedValue({
        data: [{ person, profile, summary, coverPhotoId: 'p1' }],
        total: 1,
    });
    jest.mocked(fetchChoreographerPhoto).mockClear();

    const header = renderAt('/people/choreographers/person-1', ALL);
    expect(await screen.findByRole('img', { name: /Choreographer photo/ })).toBeInTheDocument();
    expect(fetchChoreographerPhoto).toHaveBeenCalledWith('person-1', 'p1', 'thumb');
    header.unmount();

    renderAt('/people/choreographers', ALL);
    expect(await screen.findByRole('img', { name: /Choreographer photo/ })).toBeInTheDocument();
});

test('a choreographer without a photo is shown by initials and no photo is requested', async () => {
    jest.mocked(fetchChoreographerPhoto).mockClear();
    renderAt('/people/choreographers/person-1', ALL);

    await screen.findByRole('navigation', { name: 'Profile sections' });
    expect(screen.queryByRole('img', { name: /Choreographer photo/ })).not.toBeInTheDocument();
    expect(fetchChoreographerPhoto).not.toHaveBeenCalled();
});
