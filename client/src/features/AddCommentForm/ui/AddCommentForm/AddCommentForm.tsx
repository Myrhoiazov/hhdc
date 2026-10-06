import { memo, useCallback } from 'react';
import s from './AddCommentForm.module.scss';
import { Input } from '@/shared/ui/Input/Input';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { useSelector } from 'react-redux';
import {
    getAddCommentFormError,
    getAddCommentFormText,
} from '../../model/selectors/getAddCommentFormSelectors';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import {
    addCommentFormActions,
    addCommentFormReducer,
} from '../../model/slice/addCommentFormSlice';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { HStack } from '@/shared/ui/Stack';
import { t } from 'i18next';

interface AddCommentFormProps {
    className?: string;
    onSendComment: (value: string) => void;
}

const reducers: ReducersList = {
    addCommentForm: addCommentFormReducer,
};

const AddCommentForm = ({ className, onSendComment }: AddCommentFormProps) => {
    const text = useSelector(getAddCommentFormText);
    const error = useSelector(getAddCommentFormError);
    const dispatch = useAppDispatch();

    const onCommentTextChange = useCallback(
        (value: string) => {
            dispatch(addCommentFormActions.setText(value));
        },
        [dispatch]
    );

    const onSendHandler = useCallback(() => {
        onSendComment(text || '');
        onCommentTextChange('');
    }, [text]);

    return (
        <DynamicModuleLoader reducers={reducers}>
            <HStack gap="48" max>
                <Input
                    fullWidth
                    className={s.input}
                    value={text}
                    placeholder="Введите текст"
                    onChange={onCommentTextChange}
                />
                <Button onClick={onSendHandler} theme={ButtonTheme.OUTLINE}>
                    {t('отправить')}
                </Button>
            </HStack>
        </DynamicModuleLoader>
    );
};

export default memo(AddCommentForm);
