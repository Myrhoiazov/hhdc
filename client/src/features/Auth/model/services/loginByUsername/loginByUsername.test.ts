import { userActions } from '@/entities/User';
import { csrfActions } from '@/shared/api/api';
import { loginByUsername } from './loginByUsername';

jest.mock('@/shared/api/api', () => ({csrfActions: {set: jest.fn()}}));
test('stores the authenticated UUID user and CSRF token from the new session envelope', async () => {
    const user = { id: 'd22e4515-1000-4000-a000-000000000001', name: 'Team', email: 'team@example.test', roles: ['OWNER'], permissions: ['people.write'] };
    const dispatch = jest.fn();
    const extra = {api: {post: jest.fn().mockResolvedValue({data: {data: {user, csrfToken: 'test-csrf'}}})}};
    const credentials = {email: user.email, password: 'test-password'};
    const result = await loginByUsername(credentials)(dispatch, () => ({}) as never, extra as never);
    expect(result.meta.requestStatus).toBe('fulfilled');
    expect(dispatch).toHaveBeenCalledWith(userActions.setAuthData(user));
    expect(csrfActions.set).toHaveBeenCalledWith('test-csrf');
});
test('rejects invalid credentials without authenticating the user', async () => {
    const dispatch = jest.fn();
    const extra = {api: {post: jest.fn().mockRejectedValue(new Error('Invalid credentials'))}};
    const result = await loginByUsername({email: 'team@example.test', password: 'incorrect'})(dispatch, () => ({}) as never, extra as never);
    expect(result.meta.requestStatus).toBe('rejected');
    expect(dispatch).not.toHaveBeenCalledWith(userActions.setAuthData(expect.anything()));
});
test('a two-factor challenge is not a login: nobody is authenticated until the code is confirmed', async () => {
    const dispatch = jest.fn();
    const challenge = { requiresTwoFactor: true, maskedEmail: 't***@example.test' };
    const extra = {api: {post: jest.fn().mockResolvedValue({data: {data: challenge}})}};
    const result = await loginByUsername({email: 'team@example.test', password: 'test-password'})(dispatch, () => ({}) as never, extra as never);
    expect(result.meta.requestStatus).toBe('fulfilled');
    expect(result.payload).toEqual(challenge);
    expect(dispatch).not.toHaveBeenCalledWith(userActions.setAuthData(expect.anything()));
});
test('a captcha refusal carries the code and the site key from the error envelope', async () => {
    const dispatch = jest.fn();
    const error = Object.assign(new Error('captcha'), { isAxiosError: true, response: { status: 400, data: { error: { code: 'CAPTCHA_REQUIRED', message: 'Confirm that you are not a robot and try again.', siteKey: 'site-key-xyz' } } } });
    const extra = {api: {post: jest.fn().mockRejectedValue(error)}};
    const result = await loginByUsername({email: 'team@example.test', password: 'wrong'})(dispatch, () => ({}) as never, extra as never);
    expect(result.payload).toEqual({ status: 400, message: 'Confirm that you are not a robot and try again.', code: 'CAPTCHA_REQUIRED', siteKey: 'site-key-xyz' });
});
