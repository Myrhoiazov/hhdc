import { Modal } from '@/shared/ui/Modal/Modal';
import { Suspense } from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';
import { VStack } from '@/shared/ui/Stack';
import { classNames } from '@/shared/lib/classNames/classNames';
import { AddMollieSubscriptionFormAsync } from '../AddMollieSubscriptionForm/AddMollieSubscriptionForm.async';

interface AddMollieSubscriptionFormModalProps {
    className?: string;
    isOpen: boolean;
    onClose: () => void;
    reloadPage?: () => void;
}

const subscriptionFormSkeleton = (
    <VStack gap="16" align="center" max>
        <Skeleton width={280} height={24} border="6px" />
        <Skeleton width="100%" height={52} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={44} border="32px" />
    </VStack>
);

export const AddMollieSubscriptionFormModal = ({
    className,
    isOpen,
    onClose,
    reloadPage,
}: AddMollieSubscriptionFormModalProps) => (
    <Modal className={classNames('', {}, [className])} isOpen={isOpen} onClose={onClose} lazy>
        <Suspense fallback={subscriptionFormSkeleton}>
            <AddMollieSubscriptionFormAsync onSuccess={onClose} reloadPage={reloadPage} />
        </Suspense>
    </Modal>
);
