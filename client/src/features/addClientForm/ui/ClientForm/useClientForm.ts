import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { $apiPrivate } from '@/shared/api/api';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { MollieClient } from '@/entities/MollieClient';
import { getAddClientForm } from '../../model/selectors/getAddClientForm/getAddClientForm';
import { addClientData } from '../../model/services/addClientData/addClientData';
import { Branch, buildBranchOptions, buildMollieCustomerOptions, DanceGroup, MollieCustomersResponse } from './clientFormOptions';
import { useClientFormMisc } from './useClientFormMisc';
import { useClientFormReset } from './useClientFormReset';
import { useClientProfileFields } from './useClientProfileFields';

export type { PayerRelation } from './useClientFormMisc';
export { payerRelationOptions } from './useClientFormMisc';

const useClientFormState = () => {
    const misc = useClientFormMisc();
    const profileFields = useClientProfileFields(() => misc.setSelectedGroupIds([]));
    const cleanForm = useClientFormReset(profileFields, misc);

    return { ...misc, ...profileFields, cleanForm };
};

const useClientFormData = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [groups, setGroups] = useState<DanceGroup[]>([]);
    const [mollieCustomers, setMollieCustomers] = useState<MollieClient[]>([]);
    const { t } = useTranslation();
    const formData = useSelector(getAddClientForm);

    useEffect(() => {
        Promise.all([
            $apiPrivate.get<Branch[]>('/company/branches'),
            $apiPrivate.get<{ data: DanceGroup[] }>('/schedule/groups', { params: { limit: 1000 } }),
            $apiPrivate.get<MollieCustomersResponse>('/mollie/customers', { params: { _page: 1, _limit: 100 } }),
        ])
            .then(([branchesResponse, groupsResponse, customersResponse]) => {
                setBranches(branchesResponse.data.filter((branch) => branch.isActive !== false));
                setGroups(groupsResponse.data.data);
                setMollieCustomers(customersResponse.data.items);
            })
            .catch(() => {
                setBranches([]);
                setGroups([]);
                setMollieCustomers([]);
            });
    }, []);

    const branchOptions = useMemo(() => buildBranchOptions(branches, t), [branches, t]);
    const mollieCustomerOptions = useMemo(() => buildMollieCustomerOptions(mollieCustomers, t), [mollieCustomers, t]);
    const availableGroups = useMemo(
        () => groups.filter((group) => group.branchId === Number(formData?.branchId)),
        [formData?.branchId, groups],
    );

    return { formData, branchOptions, mollieCustomerOptions, availableGroups };
};

const useClientFormSubmit = (onSuccess: () => void, reloadPage: (() => void) | undefined, state: ReturnType<typeof useClientFormState>) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const formData = useSelector(getAddClientForm);
    const { file, mollieCustomerId, payerRelation, selectedGroupIds, setValidationErrors, setIsSubmitting, cleanForm } = state;

    const onSave = useCallback(async () => {
        const errors: string[] = [];
        const firstName = formData?.firstName?.trim();
        const lastName = formData?.lastName?.trim();
        const email = formData?.email?.trim();
        const phoneNumber = formData?.phoneNumber?.trim();

        if (!firstName && !lastName) errors.push('Укажите имя или фамилию ученика');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Введите корректный email или оставьте поле пустым');
        if (phoneNumber && phoneNumber.replace(/\D/g, '').length < 6) errors.push('Телефон должен содержать минимум 6 цифр');
        if (formData?.birthday && new Date(formData.birthday) > new Date()) errors.push('Дата рождения не может быть в будущем');

        if (errors.length) {
            setValidationErrors(errors);
            return;
        }

        setValidationErrors([]);
        setIsSubmitting(true);
        const result = await dispatch(addClientData({ file, mollieCustomerId, payerRelation, groupIds: selectedGroupIds }));
        setIsSubmitting(false);

        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess();
            reloadPage?.();
            cleanForm();
            toast.success(t('Ученик успешно добавлен'));
        } else {
            toast.error(t('Не удалось добавить ученика'));
        }
    }, [cleanForm, dispatch, file, formData, mollieCustomerId, onSuccess, payerRelation, reloadPage, selectedGroupIds, t, setValidationErrors, setIsSubmitting]);

    return { onSave };
};

export const useClientForm = (onSuccess: () => void, reloadPage?: () => void) => {
    const state = useClientFormState();
    const { formData, branchOptions, mollieCustomerOptions, availableGroups } = useClientFormData();
    const { onSave } = useClientFormSubmit(onSuccess, reloadPage, state);

    return {
        formData,
        branchOptions,
        mollieCustomerOptions,
        availableGroups,
        selectedGroupIds: state.selectedGroupIds,
        toggleGroup: state.toggleGroup,
        mollieCustomerId: state.mollieCustomerId,
        setMollieCustomerId: state.setMollieCustomerId,
        payerRelation: state.payerRelation,
        setPayerRelation: state.setPayerRelation,
        validationErrors: state.validationErrors,
        isSubmitting: state.isSubmitting,
        onChangeFirstName: state.onChangeFirstName,
        onChangeLastName: state.onChangeLastName,
        onChangeBirthday: state.onChangeBirthday,
        onChangePhoneNumber: state.onChangePhoneNumber,
        onChangeEmail: state.onChangeEmail,
        onChangeSocial: state.onChangeSocial,
        onChangeBranchId: state.onChangeBranchId,
        onChangePreferredLanguage: state.onChangePreferredLanguage,
        onChangeImage: state.onChangeImage,
        onSave,
    };
};
