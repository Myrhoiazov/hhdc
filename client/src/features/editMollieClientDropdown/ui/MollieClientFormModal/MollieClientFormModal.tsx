import { Modal } from '@/shared/ui/Modal/Modal';
import { Suspense } from 'react';
import { MollieClientFormAsync } from '../MollieClientForm/MollieClientForm.async';
import { Skeleton } from '@/shared/ui/Skeleton';
import { VStack } from '@/shared/ui/Stack';
import { classNames } from '@/shared/lib/classNames/classNames';

interface MollieClientFormModalProps {
    className?: string;
    clientId?: string;
    isOpen: boolean;
    onClose: () => void;
    reloadPage?: () => void;
}

const editMollieClientSkeleton = (
    <VStack gap="24" max>
        <Skeleton width={260} height={24} border="6px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={44} border="32px" />
    </VStack>
);

export const MollieClientFormModal = ({
    className,
    isOpen,
    clientId,
    onClose,
    reloadPage,
}: MollieClientFormModalProps) => (
    <Modal className={classNames('', {}, [className])} isOpen={isOpen} onClose={onClose} lazy>
        <Suspense fallback={editMollieClientSkeleton}>
            <MollieClientFormAsync
                onSuccess={onClose}
                reloadPage={reloadPage}
                clientId={clientId}
            />
        </Suspense>
    </Modal>
);
