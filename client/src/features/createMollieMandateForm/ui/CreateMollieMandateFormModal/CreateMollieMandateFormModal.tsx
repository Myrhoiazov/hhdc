import { Modal } from '@/shared/ui/Modal/Modal';
import { Suspense } from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';
import { VStack } from '@/shared/ui/Stack';
import { classNames } from '@/shared/lib/classNames/classNames';
import { CreateMollieMandateFormAsync } from '../CreateMollieMandateForm/CreateMollieMandateForm.async';

interface CreateMollieMandateFormModalProps {
    className?: string;
    isOpen: boolean;
    onClose: () => void;
    reloadPage?: () => void;
}

const mandateFormSkeleton = (
    <VStack gap="16" align="center" max>
        <Skeleton width={220} height={24} border="6px" />
        <Skeleton width="100%" height={52} border="14px" />
        <Skeleton width="100%" height={52} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={44} border="32px" />
    </VStack>
);

export const CreateMollieMandateFormModal = ({
    className,
    isOpen,
    onClose,
    reloadPage,
}: CreateMollieMandateFormModalProps) => (
    <Modal className={classNames('', {}, [className])} isOpen={isOpen} onClose={onClose} lazy>
        <Suspense fallback={mandateFormSkeleton}>
            <CreateMollieMandateFormAsync onSuccess={onClose} reloadPage={reloadPage} />
        </Suspense>
    </Modal>
);
