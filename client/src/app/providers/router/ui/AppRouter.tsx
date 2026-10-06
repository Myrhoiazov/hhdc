import { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRoutesProps } from '@/shared/config/routeConfig/routeConfig';
import { routeConfig } from '../config/routeConfig';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import PublicRoute from './PublicRoute/PublicRoute';
import PrivatRoute from './PrivatRoute/PrivatRoute';

const renderRoutes = (routes: AppRoutesProps[]) =>
    routes.map((route) => {
        const element = <Suspense fallback={<PageSkeleton />}>{route.element}</Suspense>;

        const wrappedElement = route.authOnly ? (
            <PrivatRoute>{element}</PrivatRoute>
        ) : (
            <PublicRoute restricted>{element}</PublicRoute>
        );

        if (route.index) {
            return <Route key={route.path || 'index'} index element={wrappedElement} />;
        }

        return (
            <Route key={route.path} path={route.path} element={wrappedElement}>
                {route.children && renderRoutes(route.children)}
            </Route>
        );
    });

const AppRouter = () => {
    return <Routes>{renderRoutes(Object.values(routeConfig))}</Routes>;
};

export default AppRouter;
