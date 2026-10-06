import { Modal } from '@/shared/ui/Modal/Modal';
import { Suspense } from 'react';
import { UserFormAsync } from '../UserForm/UserForm.async';
import { Skeleton } from '@/shared/ui/Skeleton';
import { VStack } from '@/shared/ui/Stack';
import { classNames } from '@/shared/lib/classNames/classNames';

interface UserFormModalProps {
    className?: string;
    isOpen: boolean;
    onClose: () => void;
    reloadPage?: () => void;
}

const userFormSkeleton = (
    <VStack gap="24" align="center" max>
        <Skeleton width={260} height={24} border="6px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={44} border="32px" />
    </VStack>
);

export const UserFormModal = ({ className, isOpen, onClose, reloadPage }: UserFormModalProps) => (
    <Modal className={classNames('', {}, [className])} isOpen={isOpen} onClose={onClose} lazy>
        <Suspense fallback={userFormSkeleton}>
            <UserFormAsync onSuccess={onClose} reloadPage={reloadPage} />
        </Suspense>
    </Modal>
);
