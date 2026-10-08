import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { addPersonRole, savePerson } from '@/entities/crm';
import { userReducer } from '@/entities/User';
import { Navbar } from './Navbar';

jest.mock('@/entities/crm', () => ({ savePerson: jest.fn(), addPersonRole: jest.fn(), listProviders: jest.fn().mockResolvedValue({ data: [], total: 0 }), composeEmail: jest.fn() }));
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => mockNavigate }));

const renderNavbar = (permissions: string[]) => {
    const store = configureStore({ reducer: { user: userReducer }, preloadedState: { user: { _inited: true, authData: { id: '1', name: 'Team', email: 'team@example.test', roles: ['VIEWER'], permissions } } } });
    return render(<Provider store={store}><MemoryRouter><Navbar /></MemoryRouter></Provider>);
};
test('viewer cannot see the create person action', () => {
    renderNavbar([]);
    expect(screen.queryByRole('button', {name: 'Add person'})).not.toBeInTheDocument();
});
test('people writers see the create person action', () => {
    renderNavbar(['people.write']);
    expect(screen.getByRole('button', {name: 'Add person'})).toBeInTheDocument();
});

test('the create person action opens a modal form, saves the person with roles and opens the new person', async () => {
    jest.mocked(savePerson).mockResolvedValue({ id: 'person-9' } as never);
    jest.mocked(addPersonRole).mockResolvedValue({} as never);
    renderNavbar(['people.write']);
    expect(screen.queryByRole('form', { name: 'Create person' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add person' }));
    const form = await screen.findByRole('form', { name: 'Create person' });
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: ' Anna ' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Smit' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'anna@example.test' } });
    fireEvent.click(screen.getByLabelText('PARTICIPANT'));
    fireEvent.submit(form);

    await waitFor(() => expect(savePerson).toHaveBeenCalledWith({ firstName: 'Anna', lastName: 'Smit', email: 'anna@example.test', phone: null, notes: '' }));
    expect(addPersonRole).toHaveBeenCalledWith('person-9', 'PARTICIPANT');
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/people/person-9'));
});

test('a failed save keeps the modal open and shows the reason', async () => {
    jest.mocked(savePerson).mockRejectedValue(new Error('Email already used'));
    renderNavbar(['people.write']);
    fireEvent.click(screen.getByRole('button', { name: 'Add person' }));
    fireEvent.submit(await screen.findByRole('form', { name: 'Create person' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email already used');
    expect(screen.getByRole('form', { name: 'Create person' })).toBeInTheDocument();
});

test('the new email action is offered only to people who may send mail, and opens the compose form', async () => {
    const view = renderNavbar(['people.write']);
    expect(screen.queryByRole('button', { name: 'New email' })).not.toBeInTheDocument();
    view.unmount();

    renderNavbar(['communications.reply']);
    expect(screen.queryByRole('form', { name: 'New email' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New email' }));
    expect(await screen.findByRole('form', { name: 'New email' })).toBeInTheDocument();
});
