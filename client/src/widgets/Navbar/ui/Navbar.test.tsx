import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { userReducer } from '@/entities/User';
import { Navbar } from './Navbar';

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
