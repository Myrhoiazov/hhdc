import { fetchProfileData } from './fetchProfileData';

const dispatch = jest.fn();
const extra = { apiPrivate: { get: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.get.mockClear();
});

describe('fetchProfileData', () => {
    test('fetches the profile and fulfills with it', async () => {
        const profile = { id: '1', firstName: 'Ivan' };
        extra.apiPrivate.get.mockResolvedValue({ data: profile });

        const result = await fetchProfileData('1')(dispatch, () => ({}) as never, extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/users/1');
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(profile);
    });

    test('rejects with a server error shape when the API call fails', async () => {
        extra.apiPrivate.get.mockRejectedValue(new Error('network error'));

        const result = await fetchProfileData('1')(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toEqual({ status: 500, message: 'Unknown error' });
    });
});
