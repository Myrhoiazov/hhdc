import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { connectWeeztix, startWeeztixAuthorization } from '@/entities/crm';
import { WeeztixConnect } from './WeeztixConnect';

jest.mock('@/entities/crm', () => ({ connectWeeztix: jest.fn(), startWeeztixAuthorization: jest.fn() }));
jest.mock('./WeeztixData', () => ({ WeeztixData: () => null }));

const onConnected = jest.fn();

beforeEach(() => {
    onConnected.mockReset();
    window.open = jest.fn();
    jest.mocked(startWeeztixAuthorization).mockResolvedValue({ url: 'https://login.weeztix.com/login?state=s1', redirectUri: 'https://example.test/', state: 's1' });
    jest.mocked(connectWeeztix).mockReset();
});

test('connecting opens Weeztix in a new tab and then asks for the address it returned to', async () => {
    jest.mocked(connectWeeztix).mockResolvedValue({ id: 'p1', name: 'Weeztix', type: 'TICKETING', provider: 'WEEZTIX', status: 'CONNECTED', settings: { companyName: 'HHDC' } });
    render(<WeeztixConnect onConnected={onConnected} />);
    expect(screen.queryByRole('form', { name: 'Finish connecting Weeztix' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Connect Weeztix' }));
    await waitFor(() => expect(window.open).toHaveBeenCalledWith('https://login.weeztix.com/login?state=s1', '_blank', 'noopener'));
    fireEvent.change(await screen.findByLabelText('Address of the page you were returned to, or the code'), { target: { value: ' https://example.test/?code=abc&state=s1 ' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Finish connecting Weeztix' }));

    await waitFor(() => expect(connectWeeztix).toHaveBeenCalledWith('https://example.test/?code=abc&state=s1', 's1'));
    expect(await screen.findByRole('status')).toHaveTextContent('Weeztix connected');
    expect(onConnected).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('form', { name: 'Finish connecting Weeztix' })).not.toBeInTheDocument();
});

test('a refused address keeps the step open and shows the reason', async () => {
    jest.mocked(connectWeeztix).mockRejectedValue(new Error('Weeztix refused the request: Code already used'));
    render(<WeeztixConnect connectionId="p1" onConnected={onConnected} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reconnect Weeztix' }));
    fireEvent.change(await screen.findByLabelText('Address of the page you were returned to, or the code'), { target: { value: 'https://example.test/?code=old&state=s1' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Finish connecting Weeztix' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Code already used');
    expect(screen.getByRole('form', { name: 'Finish connecting Weeztix' })).toBeInTheDocument();
    expect(onConnected).not.toHaveBeenCalled();
});
