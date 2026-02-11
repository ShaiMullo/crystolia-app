"use client";

import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import ToasterProvider from '../components/ToasterProvider';

interface ClientProvidersProps {
    children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
    return (
        <>
            <ToasterProvider />
            <AuthProvider>
                {children}
            </AuthProvider>
        </>
    );
}
