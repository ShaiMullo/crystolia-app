"use client";

import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import ToasterProvider from '../components/ToasterProvider';
import { I18nProvider } from '@/i18n/I18nProvider';

interface ClientProvidersProps {
    children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
    return (
        <I18nProvider>
            <ToasterProvider />
            <AuthProvider>
                {children}
            </AuthProvider>
        </I18nProvider>
    );
}
