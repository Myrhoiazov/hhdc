import { $apiPrivate } from '@/shared/api/api';
import {
    createEmailAccount,
    deleteEmailAccount,
    fetchEmailAccounts,
    syncEmailAccount,
} from './emailAccountApi';

jest.mock('@/shared/api/api', () => ({
    $apiPrivate: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('emailAccountApi', () => {
    test('fetchEmailAccounts GETs the accounts list', async () => {
        const accounts = [{ id: 1 }];
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: accounts });

        const result = await fetchEmailAccounts();

        expect($apiPrivate.get).toHaveBeenCalledWith('/email/accounts');
        expect(result).toEqual(accounts);
    });

    test('createEmailAccount POSTs the payload', async () => {
        const payload = { email: 'a@b.com', password: 'secret' } as never;
        const created = { id: 1, email: 'a@b.com' };
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: created });

        const result = await createEmailAccount(payload);

        expect($apiPrivate.post).toHaveBeenCalledWith('/email/accounts', payload);
        expect(result).toEqual(created);
    });

    test('deleteEmailAccount DELETEs by id', async () => {
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({});

        await deleteEmailAccount(1);

        expect($apiPrivate.delete).toHaveBeenCalledWith('/email/accounts/1');
    });

    test('syncEmailAccount POSTs to the sync endpoint', async () => {
        const syncResult = { synced: 3 };
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: syncResult });

        const result = await syncEmailAccount(1);

        expect($apiPrivate.post).toHaveBeenCalledWith('/email/accounts/1/sync');
        expect(result).toEqual(syncResult);
    });
});
