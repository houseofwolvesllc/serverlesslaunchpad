import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app.tsx';

// Import shims FIRST to ensure they're applied before any AWS Amplify code runs
import './configuration/moto_amplify_shims';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
