import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import App from './app/App';
import '../src/app/styles/index.scss';
import './shared/config/i18n/i18n';
import ErrorBoundary from '@/app/providers/ErrorBoundary';
import { StoreProvider } from '@/app/providers/StoreProvider';

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
    <BrowserRouter>
        <StoreProvider>
            <ErrorBoundary>
                <ThemeProvider>
                    <App />
                </ThemeProvider>
            </ErrorBoundary>
        </StoreProvider>
    </BrowserRouter>
);
