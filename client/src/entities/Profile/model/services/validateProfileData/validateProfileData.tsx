import { IProfile, ValidateProfileError } from '../../types/profile';

export const validateProfileData = (profile?: IProfile) => {
    if (!profile) {
        return [ValidateProfileError.NO_DATA];
    }
    const { firstName, lastName } = profile;

    const errors: ValidateProfileError[] = [];

    if (!firstName || !lastName) {
        errors.push(ValidateProfileError.INCORRECT_USER_DATA);
    }

    return errors;
};
