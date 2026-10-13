import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { getUserPermissions } from '../selectors/getUserPermissions/getUserPermissions';
import { Can } from '../types/permission';
import { hasPermission } from './hasPermission';

// What the signed-in user may do: `const can = useCan(); can('finance.read')`.
export const useCan = (): Can => {
    const held = useSelector(getUserPermissions);
    return useCallback(permission => hasPermission(held, permission), [held]);
};
