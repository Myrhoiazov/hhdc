import { useCallback, useState } from 'react';
import { SelectOption } from '@/shared/ui/Select/Select';

export type PayerRelation = 'self' | 'parent' | 'guardian' | 'unknown';

export const payerRelationOptions: SelectOption<PayerRelation>[] = [
    { value: 'self', content: 'Сам ученик' },
    { value: 'parent', content: 'Родитель' },
    { value: 'guardian', content: 'Опекун' },
    { value: 'unknown', content: 'Не указано' },
];

export const useClientFormMisc = () => {
    const [file, setFile] = useState<File | null>(null);
    const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
    const [mollieCustomerId, setMollieCustomerId] = useState('');
    const [payerRelation, setPayerRelation] = useState<PayerRelation>('parent');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onChangeImage = useCallback((newFile?: File) => {
        if (!newFile) return;
        if (!newFile.type.startsWith('image/')) {
            setValidationErrors(['Фото должно быть изображением']);
            return;
        }
        if (newFile.size > 5 * 1024 * 1024) {
            setValidationErrors(['Размер фото не должен превышать 5 MB']);
            return;
        }
        setFile(newFile);
        setValidationErrors([]);
    }, []);

    const toggleGroup = useCallback((groupId: number) => {
        setSelectedGroupIds((current) => current.includes(groupId)
            ? current.filter((id) => id !== groupId)
            : [...current, groupId]);
    }, []);

    return {
        file, setFile, selectedGroupIds, setSelectedGroupIds,
        mollieCustomerId, setMollieCustomerId,
        payerRelation, setPayerRelation,
        validationErrors, setValidationErrors,
        isSubmitting, setIsSubmitting,
        onChangeImage, toggleGroup,
    };
};
