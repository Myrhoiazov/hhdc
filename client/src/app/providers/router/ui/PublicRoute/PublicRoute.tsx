import { getUserAuthData } from '@/entities/User';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { RoutePath } from '@/shared/config/routeConfig/routeConfig';

interface PublicRouteProps {
    restricted?: boolean;
    to?: string;
    children: React.ReactNode;
}

const PublicRoute = ({ restricted = false, to, children }: PublicRouteProps) => {
    const authData = useSelector(getUserAuthData);
    const shouldRedirect = Boolean(authData) && restricted;

    return shouldRedirect ? <Navigate to={RoutePath.main} /> : <>{children}</>;
};

export default PublicRoute;
