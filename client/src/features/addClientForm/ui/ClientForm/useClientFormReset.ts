import { useCallback } from 'react';
import type { useClientFormMisc } from './useClientFormMisc';
import type { useClientProfileFields } from './useClientProfileFields';

export const useClientFormReset = (
    profileFields: ReturnType<typeof useClientProfileFields>,
    misc: ReturnType<typeof useClientFormMisc>,
) => useCallback(() => {
    profileFields.onChangeFirstName('');
    profileFields.onChangeLastName('');
    profileFields.onChangeBirthday('');
    profileFields.onChangePhoneNumber('');
    profileFields.onChangeEmail('');
    profileFields.onChangeSocial('');
    profileFields.onChangeBranchId('');
    misc.setSelectedGroupIds([]);
    misc.setMollieCustomerId('');
    misc.setPayerRelation('parent');
    misc.setFile(null);
    misc.setValidationErrors([]);
}, [profileFields, misc]);
