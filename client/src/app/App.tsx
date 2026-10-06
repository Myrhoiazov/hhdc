import { classNames } from '@/shared/lib/classNames/classNames';
import { Navbar } from '@/widgets/Navbar';
import { Sidebar } from '@/widgets/Sidebar';
import AppRouter from './providers/router/ui/AppRouter';
import { useEffect, useState } from 'react';
import { getUserAuthData, getUserInited, initAuthData } from '@/entities/User';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useSelector } from 'react-redux';
import { ToastContainer } from 'react-toastify';

const App = () => {
    const dispatch = useAppDispatch();
    const authData = useSelector(getUserAuthData);
    const inited = useSelector(getUserInited);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!inited) {
            dispatch(initAuthData());
        }
    }, [dispatch, authData]);

    if (!authData) {
        return <AppRouter />;
    }

    return (
        <div className={classNames('app', {}, [])}>
            <Navbar onMobileMenuToggle={() => setMobileMenuOpen((prev) => !prev)} />
            <div className="content-page">
                <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
                <AppRouter />
            </div>
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick={false}
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
        </div>
    );
};

export default App;
