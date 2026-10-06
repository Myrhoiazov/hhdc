import { getUserAuthData, getUserInited } from '@/entities/User';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

const PrivatRoute = ({ children }: { children: React.ReactNode }) => {
    const authData = useSelector(getUserAuthData);
    const inited = useSelector(getUserInited);

    if (!inited) {
        return <PageSkeleton />;
    }

    return authData ? <>{children}</> : <Navigate to="/login" />;
};

export default PrivatRoute;
