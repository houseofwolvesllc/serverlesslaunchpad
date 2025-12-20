import { Toaster as HotToaster } from 'react-hot-toast';

export const Toaster = () => {
    return (
        <HotToaster
            position="top-center"
            toastOptions={{
                duration: 4000,
                style: {
                    background: '#ffffff',
                    color: '#1f2937',
                    border: '1px solid #e5e7eb',
                    opacity: 1,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15)',
                    padding: '16px',
                },
                success: {
                    duration: 3000,
                    style: {
                        background: '#10b981',
                        color: '#ffffff',
                    },
                    iconTheme: {
                        primary: '#ffffff',
                        secondary: '#10b981',
                    },
                },
                error: {
                    duration: 5000,
                    style: {
                        background: '#ef4444',
                        color: '#ffffff',
                    },
                    iconTheme: {
                        primary: '#ffffff',
                        secondary: '#ef4444',
                    },
                },
            }}
        />
    );
};
