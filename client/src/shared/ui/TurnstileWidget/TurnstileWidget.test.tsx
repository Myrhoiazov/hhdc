import { render, waitFor } from '@testing-library/react';
import { TurnstileWidget } from './TurnstileWidget';

describe('TurnstileWidget', () => {
    beforeEach(() => {
        window.turnstile = undefined;
    });

    test('renders the Turnstile widget with the given site key once the SDK is available', async () => {
        const renderMock = jest.fn().mockReturnValue('widget-id');
        window.turnstile = { render: renderMock, remove: jest.fn() };

        render(<TurnstileWidget siteKey="test-site-key" onVerify={jest.fn()} />);

        await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1));
        expect(renderMock.mock.calls[0][1]).toMatchObject({ sitekey: 'test-site-key' });
    });

    test('calls onVerify with the token produced by the Turnstile callback', async () => {
        const onVerify = jest.fn();
        let capturedCallback: ((token: string) => void) | undefined;
        window.turnstile = {
            render: jest.fn().mockImplementation((_container, options) => {
                capturedCallback = options.callback;
                return 'widget-id';
            }),
            remove: jest.fn(),
        };

        render(<TurnstileWidget siteKey="test-site-key" onVerify={onVerify} />);

        await waitFor(() => expect(capturedCallback).toBeDefined());
        capturedCallback?.('captcha-token-123');

        expect(onVerify).toHaveBeenCalledWith('captcha-token-123');
    });

    test('clears the token when Turnstile expires or errors', async () => {
        const onReset = jest.fn();
        let expiredCallback: (() => void) | undefined;
        let errorCallback: (() => void) | undefined;
        window.turnstile = {
            render: jest.fn().mockImplementation((_container, options) => {
                expiredCallback = options['expired-callback'];
                errorCallback = options['error-callback'];
                return 'widget-id';
            }),
            remove: jest.fn(),
        };

        render(<TurnstileWidget siteKey="test-site-key" onVerify={jest.fn()} onReset={onReset} />);

        await waitFor(() => expect(window.turnstile?.render).toHaveBeenCalled());
        expiredCallback?.();
        errorCallback?.();

        expect(onReset).toHaveBeenCalledTimes(2);
    });

    test('removes the widget on unmount', async () => {
        const removeMock = jest.fn();
        window.turnstile = {
            render: jest.fn().mockReturnValue('widget-id'),
            remove: removeMock,
        };

        const { unmount } = render(<TurnstileWidget siteKey="test-site-key" onVerify={jest.fn()} />);
        await waitFor(() => expect(window.turnstile?.render).toHaveBeenCalled());

        unmount();

        expect(removeMock).toHaveBeenCalledWith('widget-id');
    });
});
