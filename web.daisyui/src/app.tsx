import './index.css';
import { Router } from './components/router';
import { Toaster } from '@/components/toaster';
import { BrowserRouter } from 'react-router-dom';
import { LoadingProvider } from './context/loading_context';
import { AuthenticationProvider } from './features/authentication/providers/authentication_provider';
import { ConfirmDeleteProvider } from './utils/confirm_delete';
import { ThemeProvider } from './components/theme_provider';

export const App = () => {
    return (
        <ThemeProvider defaultTheme="system" storageKey="daisyui-theme">
            <LoadingProvider>
                <BrowserRouter>
                    <Toaster />
                    <ConfirmDeleteProvider>
                        <AuthenticationProvider>
                            <Router />
                        </AuthenticationProvider>
                    </ConfirmDeleteProvider>
                </BrowserRouter>
            </LoadingProvider>
        </ThemeProvider>
    );
};
