import { ValidateProfileError } from '../../types/profile';
import { validateProfileData } from './validateProfileData';

describe('validateProfileData', () => {
    test('returns NO_DATA when the profile is missing', () => {
        expect(validateProfileData(undefined)).toEqual([ValidateProfileError.NO_DATA]);
    });

    test('returns INCORRECT_USER_DATA when firstName is missing', () => {
        const errors = validateProfileData({ lastName: 'Petrov' });
        expect(errors).toEqual([ValidateProfileError.INCORRECT_USER_DATA]);
    });

    test('returns INCORRECT_USER_DATA when lastName is missing', () => {
        const errors = validateProfileData({ firstName: 'Ivan' });
        expect(errors).toEqual([ValidateProfileError.INCORRECT_USER_DATA]);
    });

    test('returns no errors when firstName and lastName are present', () => {
        const errors = validateProfileData({ firstName: 'Ivan', lastName: 'Petrov' });
        expect(errors).toEqual([]);
    });
});
