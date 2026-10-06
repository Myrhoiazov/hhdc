import { useMemo } from 'react';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { addMollieClientActions } from '../../model/slices/addMollieClientSlice';

type ProfileField = 'consumerAccount' | 'consumerName' | 'consumerBic' | 'givenName' | 'familyName' | 'email' | 'city';

export const useMollieClientProfileUpdaters = () => {
    const dispatch = useAppDispatch();

    // One stable updater per profile field instead of seven near-identical
    // useCallback blocks; each closure only writes its own slice field.
    return useMemo(() => {
        const updater = (field: ProfileField) => (value?: string) => {
            dispatch(addMollieClientActions.updateProfile({ [field]: value }));
        };

        return {
            consumerAccount: updater('consumerAccount'),
            consumerName: updater('consumerName'),
            consumerBic: updater('consumerBic'),
            givenName: updater('givenName'),
            familyName: updater('familyName'),
            email: updater('email'),
            city: updater('city'),
        };
    }, [dispatch]);
};
