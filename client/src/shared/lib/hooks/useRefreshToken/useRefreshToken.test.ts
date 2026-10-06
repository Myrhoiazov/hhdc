import { renderHook } from '@testing-library/react';
import { $api } from '@/shared/api/api';
import useRefreshToken from './useRefreshToken';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
}));

describe('useRefreshToken', () => {
    test('requests /refresh with credentials and returns the access token', async () => {
        jest.mocked($api.get).mockResolvedValue({
            data: { accessToken: 'new-token' },
        });

        const { result } = renderHook(() => useRefreshToken());
        const accessToken = await result.current();

        expect($api.get).toHaveBeenCalledWith('/refresh', { withCredentials: true });
        expect(accessToken).toBe('new-token');
    });
});
