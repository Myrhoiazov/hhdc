import { Modal } from '@/shared/ui/Modal/Modal';
import { Suspense } from 'react';
import { AddTransactionFormAsync } from '../AddTransactionForm/AddTransactionForm.async';
import { Skeleton } from '@/shared/ui/Skeleton';
import { VStack } from '@/shared/ui/Stack';
import { classNames } from '@/shared/lib/classNames/classNames';

interface AddTransactionFormProps {
    className?: string;
    isOpen: boolean;
    onClose: () => void;
    reloadPage?: () => void;
}

const transactionFormSkeleton = (
    <VStack gap="16" max>
        <Skeleton width={260} height={24} border="6px" />
        <Skeleton width="100%" height={52} border="14px" />
        <Skeleton width="100%" height={52} border="14px" />
        <Skeleton width="100%" height={52} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={44} border="32px" />
    </VStack>
);

export const AddTransactionFormModal = ({
    className,
    isOpen,
    onClose,
    reloadPage,
}: AddTransactionFormProps) => (
    <Modal className={classNames('', {}, [className])} isOpen={isOpen} onClose={onClose} lazy>
        <Suspense fallback={transactionFormSkeleton}>
            <AddTransactionFormAsync onSuccess={onClose} reloadPage={reloadPage} />
        </Suspense>
    </Modal>
);
