/**
 * Mantine Theme Configuration
 *
 * Custom theme to match shadcn/ui color scheme for visual consistency
 * across different frontend implementations.
 */

import { createTheme, MantineColorsTuple } from '@mantine/core';

// Custom blue color palette matching shadcn primary
const blue: MantineColorsTuple = [
    '#eff6ff', // 0 - lightest
    '#dbeafe', // 1
    '#bfdbfe', // 2
    '#93c5fd', // 3
    '#60a5fa', // 4
    '#3b82f6', // 5 - primary (shadcn primary light)
    '#2563eb', // 6
    '#1d4ed8', // 7
    '#1e40af', // 8
    '#1e3a8a', // 9 - darkest
];

export const theme = createTheme({
    primaryColor: 'blue',
    colors: {
        blue,
        // Dark background colors matching shadcn
        dark: [
            '#f8fafc', // 0 - lightest (slate-50)
            '#f1f5f9', // 1 (slate-100)
            '#e2e8f0', // 2 (slate-200)
            '#cbd5e1', // 3 (slate-300)
            '#94a3b8', // 4 (slate-400)
            '#64748b', // 5 (slate-500)
            '#475569', // 6 (slate-600)
            '#1e293b', // 7 - muted dark (shadcn --muted dark)
            '#0f172a', // 8
            '#020617', // 9 - darkest background (shadcn --background dark)
        ],
    },
    // Other theme customizations can go here
});
