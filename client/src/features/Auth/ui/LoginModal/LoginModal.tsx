import { Modal } from '@/shared/ui/Modal/Modal';
import { Suspense } from 'react';
import { LoginFormAsync } from '../LoginForm/LoginForm.async';
import { Skeleton } from '@/shared/ui/Skeleton';
import { VStack } from '@/shared/ui/Stack';
import { classNames } from '@/shared/lib/classNames/classNames';

interface LoginModalProps {
    className?: string;
    isOpen: boolean;
    onClose: () => void;
}

const loginSkeleton = (
    <VStack gap="16" align="center" max>
        <Skeleton width={112} height={80} border="8px" />
        <Skeleton width={200} height={24} border="6px" />
        <Skeleton width={260} height={18} border="6px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={44} border="32px" />
    </VStack>
);

export const LoginModal = ({ className, isOpen, onClose }: LoginModalProps) => (
    <Modal className={classNames('', {}, [className])} isOpen={isOpen} onClose={onClose} lazy>
        <Suspense fallback={loginSkeleton}>
            <LoginFormAsync onSuccess={onClose} />
        </Suspense>
    </Modal>
);
