'use client';

import React, { createContext, useContext, useState } from 'react';
import api from '@/app/lib/api';
import { useRouter } from 'next/navigation';

interface Customer {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
}

interface User {
    _id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    profilePicture?: string; // Legacy/Social
    avatar?: string; // New Standard
    onboardingComplete?: boolean;
    customer?: Customer;
}

interface LoginData {
    email: string;
    password: string;
}

interface RegisterData {
    email: string;
    password: string;
    name: string;
    phone: string;
    companyName: string;
    locale: 'he' | 'en' | 'ru';
}

interface RegistrationResult {
    status: 'pending_approval';
    emailNotificationSent: boolean;
}

interface AuthContextType {
    user: User | null;
    login: (data: LoginData) => Promise<void>;
    register: (data: RegisterData) => Promise<RegistrationResult>;
    logout: () => Promise<void>;
    updateUser: (userData: Partial<User>) => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        if (typeof window === 'undefined') return null;
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [isLoading] = useState(() => {
        if (typeof window === 'undefined') return true;
        return false;
    });
    const router = useRouter();

    const login = async (credentials: LoginData) => {
        try {
            const response = await api.post('/auth/login', credentials);
            const { user } = response.data;

            setUser(user);
            localStorage.setItem('user', JSON.stringify(user));

            // Get current locale from URL or default to 'he'
            const currentPath = window.location.pathname;
            const segments = currentPath.split('/').filter(Boolean);
            const locale = segments[0] === 'en' || segments[0] === 'ru' ? segments[0] : 'he';

            // Redirect based on role
            if (user.role === 'admin') {
                window.location.href = `${process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.crystolia.com'}/admin`;
            } else if (user.role === 'agent') {
                window.location.href = `${process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.crystolia.com'}/agent`;
            } else {
                router.push(`/${locale}/dashboard`);
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const register = async (userData: RegisterData) => {
        try {
            const payload = {
                name: userData.name,
                email: userData.email,
                password: userData.password,
                companyName: userData.companyName,
                phone: userData.phone,
                locale: userData.locale,
            };

            const response = await api.post('/auth/register', payload);
            return {
                status: response.data?.status || 'pending_approval',
                emailNotificationSent: response.data?.emailNotificationSent === true,
            };
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    };

    const logout = async () => {
        setUser(null);
        localStorage.removeItem('user');
        try {
            // Clear HttpOnly cookie on backend — cannot be done from JS directly
            await api.post('/auth/logout');
        } catch {
            // Ignore — user is logged out client-side regardless
        }
        router.push('/he');
    };

    const updateUser = (userData: Partial<User>) => {
        const updatedUser = { ...user, ...userData } as User;
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
