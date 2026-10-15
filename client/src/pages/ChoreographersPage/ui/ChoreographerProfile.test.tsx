import { renderAt, ALL, answerChoreographerRequests } from './ChoreographerPages.testHelpers';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
    addBioVersion,
    getChoreographer,
    listBioVersions,
    listChoreographerContacts,
    updateChoreographer,
} from '@/entities/Choreographer';

answerChoreographerRequests();

test('the profile shows the header summary, events and what is still missing', async () => {
    renderAt('/people/choreographers/person-1', ['choreographers.read']);

    expect(await screen.findByRole('heading', { name: 'Jojo Gomez' })).toBeInTheDocument();
    expect(screen.getByText('Los Angeles, US')).toBeInTheDocument();
    expect(screen.getByText('Open tasks: 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'HHDC 2027' })).toHaveAttribute(
        'href',
        '/events/event-27'
    );
    expect(screen.getByRole('list', { name: 'Missing from the profile' })).toHaveTextContent(
        'Dance styles'
    );
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
});

test('the biography tab is route-addressable and saves normalised lists', async () => {
    renderAt('/people/choreographers/person-1/biography', [
        'choreographers.read',
        'choreographers.update',
    ]);

    const styles = await screen.findByLabelText('Dance styles (comma separated)');
    expect(screen.getByLabelText('Stage name')).toHaveValue('Jojo Gomez');
    fireEvent.change(styles, { target: { value: 'heels, frame up' } });
    fireEvent.change(screen.getByLabelText('Relationship'), { target: { value: 'RETURNING' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
        expect(updateChoreographer).toHaveBeenCalledWith(
            'person-1',
            expect.objectContaining({
                stageName: 'Jojo Gomez',
                styles: ['heels', 'frame up'],
                relationshipStatus: 'RETURNING',
                instagramUrl: 'https://instagram.com/jojo',
                websiteUrl: '',
            })
        )
    );
    await waitFor(() => expect(getChoreographer).toHaveBeenCalledTimes(2));
});

test('without the update permission the biography is read-only', async () => {
    renderAt('/people/choreographers/person-1/biography', ['choreographers.read']);

    expect(await screen.findByText('Heels choreographer from LA.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://instagram.com/jojo' })).toHaveAttribute(
        'rel',
        'noreferrer noopener'
    );
});

test('tabs are offered by permission, and a tab the user may not read falls back to the overview', async () => {
    renderAt('/people/choreographers/person-1/contacts', ['choreographers.read']);

    expect(await screen.findByRole('link', { name: 'Overview' })).toHaveAttribute(
        'aria-current',
        'page'
    );
    expect(screen.getByRole('link', { name: 'Photos' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Contacts' })).not.toBeInTheDocument();
    expect(listChoreographerContacts).not.toHaveBeenCalled();
});

test('a biography variant is saved as a new version and earlier versions are counted', async () => {
    jest.mocked(listBioVersions).mockResolvedValue([
        {
            id: 'bio-2',
            locale: 'nl',
            kind: 'PROMO',
            content: 'Nieuwe tekst',
            version: 2,
            isCurrent: true,
            createdAt: '2026-10-08T10:00:00.000Z',
        },
        {
            id: 'bio-1',
            locale: 'nl',
            kind: 'PROMO',
            content: 'Oude tekst',
            version: 1,
            isCurrent: false,
            createdAt: '2026-10-01T10:00:00.000Z',
        },
    ]);
    renderAt('/people/choreographers/person-1/biography', ALL);

    const variant = await screen.findByRole('article', { name: 'NL · BIO_PROMO' });
    expect(variant).toHaveTextContent('Nieuwe tekst');
    expect(variant).toHaveTextContent('Earlier versions: 1');
    expect(screen.queryByText('Oude tekst')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Language code'), { target: { value: 'ru' } });
    fireEvent.change(screen.getByLabelText('Variant text'), {
        target: { value: 'Текст на русском' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save as new version' }));

    await waitFor(() =>
        expect(addBioVersion).toHaveBeenCalledWith('person-1', {
            locale: 'ru',
            kind: 'PROMO',
            content: 'Текст на русском',
        })
    );
});
