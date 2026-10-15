import {
    renderAt,
    ALL,
    manager,
    photo,
    answerChoreographerRequests,
} from './ChoreographerPages.testHelpers';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
    createChoreographerContact,
    deactivateChoreographerContact,
    fetchChoreographerPhoto,
    listChoreographerContacts,
    listChoreographerPhotos,
    reorderChoreographerPhotos,
    updateChoreographerPhoto,
    uploadChoreographerPhoto,
} from '@/entities/Choreographer';
import { movePhoto, photoProblem } from '../model/photos';

answerChoreographerRequests();

test('a manager contact is added and a former one is deactivated, not deleted', async () => {
    jest.mocked(listChoreographerContacts).mockResolvedValue([manager]);
    renderAt('/people/choreographers/person-1/contacts', ALL);

    expect(await screen.findByText('Sam Lee')).toBeInTheDocument();
    expect(screen.getByText('MANAGER · Agency')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Contact type'), { target: { value: 'ACCOUNTING' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bills@agency.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add contact' }));
    await waitFor(() =>
        expect(createChoreographerContact).toHaveBeenCalledWith(
            'person-1',
            expect.objectContaining({
                kind: 'ACCOUNTING',
                email: 'bills@agency.test',
                isPrimary: false,
            })
        )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    await waitFor(() =>
        expect(deactivateChoreographerContact).toHaveBeenCalledWith('person-1', 'contact-1')
    );
});

test('photos are uploaded one by one, reordered, and one can be made the cover', async () => {
    jest.mocked(listChoreographerPhotos).mockResolvedValue([photo('p1', 0, true), photo('p2', 1)]);
    renderAt('/people/choreographers/person-1/media', ALL);

    expect(await screen.findByText('2 / 10')).toBeInTheDocument();
    await waitFor(() =>
        expect(fetchChoreographerPhoto).toHaveBeenCalledWith('person-1', 'p1', 'thumb')
    );
    const file = new File(['img'], 'stage.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText(/Upload photos/), { target: { files: [file] } });
    await waitFor(() => expect(uploadChoreographerPhoto).toHaveBeenCalledWith('person-1', file));

    fireEvent.click(await screen.findByRole('button', { name: 'Photo 2: Move earlier' }));
    await waitFor(() =>
        expect(reorderChoreographerPhotos).toHaveBeenCalledWith('person-1', ['p2', 'p1'])
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Photo 2: Make cover' }));
    await waitFor(() =>
        expect(updateChoreographerPhoto).toHaveBeenCalledWith('person-1', 'p2', { isCover: true })
    );
});

test('a file that cannot be a photo is refused before any upload', async () => {
    renderAt('/people/choreographers/person-1/media', ALL);

    await screen.findByText('0 / 10');
    fireEvent.change(screen.getByLabelText(/Upload photos/), {
        target: { files: [new File(['x'], 'contract.pdf', { type: 'application/pdf' })] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
        'contract.pdf: Only JPEG, PNG and WebP photos are accepted'
    );
    expect(uploadChoreographerPhoto).not.toHaveBeenCalled();
});

test('photo rules: the tenth photo is the last, and moving stays inside the list', () => {
    const jpeg = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    expect(photoProblem(jpeg, 9)).toBe('');
    expect(photoProblem(jpeg, 10)).toBe('A choreographer can have at most 10 photos');
    expect(movePhoto(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b']);
    expect(movePhoto(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
});

test('without the media permission photos are shown without controls', async () => {
    jest.mocked(listChoreographerPhotos).mockResolvedValue([photo('p1', 0, true)]);
    renderAt('/people/choreographers/person-1/media', ['choreographers.read']);

    expect(await screen.findByText('Cover')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Upload photos/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
});
