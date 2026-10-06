import { useTranslation } from 'react-i18next';
import { memo, useCallback, Suspense } from 'react';
import { useSelector } from 'react-redux';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Text } from '@/shared/ui/Text/Text';
import { AddCommentForm } from '@/features/AddCommentForm';
import { CommentList } from '@/entities/Comment';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import { VStack } from '@/shared/ui/Stack';
import { Skeleton } from '@/shared/ui/Skeleton';
import { fetchCommentsByClientId } from '../../model/services/fetchCommentsByClientId/fetchCommentsByClientId';
import { getClientComments } from '../../model/slices/clientDetailsCommentsSlice';
import { getClientCommentsIsLoading } from '../../model/selectors/comments';
import { addCommentsForClient } from '../../model/services/addCommentsForClient/addCommentsForClient';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';

interface ClientDetailsCommentsProps {
    className?: string;
    id?: string;
}

export const ClientDetailsComments = memo((props: ClientDetailsCommentsProps) => {
    const { className, id } = props;
    const { t } = useTranslation();
    const comments = useSelector(getClientComments.selectAll);
    const commentsIsLoading = useSelector(getClientCommentsIsLoading);
    const dispatch = useAppDispatch();

    const onSendComment = useCallback(
        (text: string) => {
            dispatch(addCommentsForClient(text));
        },
        [dispatch]
    );

    useInitialEffect(() => {
        dispatch(fetchCommentsByClientId(id));
    });

    return (
        <VStack gap="16" max className={classNames('', {}, [className])}>
            <Text size="l" title={t('Комментарии')} />
            <Suspense fallback={<Skeleton height={44} width="100%" />}>
                <AddCommentForm onSendComment={onSendComment} />
            </Suspense>
            <CommentList isLoading={commentsIsLoading} comments={comments} />
        </VStack>
    );
});
