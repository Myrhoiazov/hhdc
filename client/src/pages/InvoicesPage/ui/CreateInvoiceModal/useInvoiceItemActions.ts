import { useCallback } from 'react';
import { emptyItem, type FormItem, type useInvoiceFormState } from './useCreateInvoiceModal';

export const useInvoiceItemActions = (formState: ReturnType<typeof useInvoiceFormState>) => {
    const updateItem = useCallback((index: number, patch: Partial<FormItem>) => {
        formState.setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    }, [formState]);

    const addItem = useCallback(() => {
        formState.setItems((current) => [...current, emptyItem()]);
    }, [formState]);

    const removeItem = useCallback((index: number) => {
        formState.setItems((current) => current.filter((_, i) => i !== index));
    }, [formState]);

    return { updateItem, addItem, removeItem };
};
