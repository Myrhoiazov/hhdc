import { Modal } from '@/shared/ui/Modal/Modal';
import { Suspense } from 'react';
import { ClientFormAsync } from '../MollieClientForm/MollieClientForm.async';
import { Skeleton } from '@/shared/ui/Skeleton';
import { VStack } from '@/shared/ui/Stack';
import { classNames } from '@/shared/lib/classNames/classNames';

interface ClientFormProps {
    className?: string;
    isOpen: boolean;
    onClose: () => void;
    reloadPage?: () => void;
}

const mollieClientFormSkeleton = (
    <VStack gap="24" max>
        <Skeleton width={240} height={24} border="6px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={44} border="32px" />
    </VStack>
);

export const ClientFormModal = ({ className, isOpen, onClose, reloadPage }: ClientFormProps) => (
    <Modal className={classNames('', {}, [className])} isOpen={isOpen} onClose={onClose} lazy>
        <Suspense fallback={mollieClientFormSkeleton}>
            <ClientFormAsync onSuccess={onClose} reloadPage={reloadPage} />
        </Suspense>
    </Modal>
);
