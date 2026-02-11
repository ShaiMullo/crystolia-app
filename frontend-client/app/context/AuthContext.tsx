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
    firstName: string;
    lastName: string;
    phone?: string;
    role?: string;
    companyName?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (data: LoginData) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
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
    const [token, setToken] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('token');
    });
    const [isLoading] = useState(() => {
        if (typeof window === 'undefined') return true;
        return false;
    });
    const router = useRouter();

    // Check for social login token in URL
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tokenParam = params.get('token');
            const userId = params.get('userId');

            if (tokenParam && userId) {
                const profilePic = params.get('profilePicture');
                const userObj: User = {
                    _id: userId,
                    email: params.get('email') || '',
                    role: params.get('role') || 'customer',
                    firstName: params.get('firstName') || '',
                    lastName: params.get('lastName') || '',
                    profilePicture: profilePic ? decodeURIComponent(profilePic) : undefined
                };

                setToken(tokenParam);
                setUser(userObj);
                localStorage.setItem('token', tokenParam);
                localStorage.setItem('user', JSON.stringify(userObj));

                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);

                // Redirect
                if (userObj.role === 'admin') router.push('/he/admin');
                else if (userObj.role === 'secretary') router.push('/he/secretary');
                else router.push('/he/dashboard');
            }
        }
    }, [router]);

    const login = async (credentials: LoginData) => {
        try {
            const response = await api.post('/auth/login', credentials);
            const { token: access_token, user } = response.data;

            // Normalize token key if backend returns 'token' instead of 'access_token'
            const finalToken = access_token || response.data.token;

            setToken(finalToken);
            setUser(user);

            localStorage.setItem('token', finalToken);
            localStorage.setItem('user', JSON.stringify(user));

            // Get current locale from URL or default to 'he'
            const currentPath = window.location.pathname;
            const segments = currentPath.split('/').filter(Boolean);
            const locale = segments[0] === 'en' || segments[0] === 'ru' ? segments[0] : 'he';

            // Redirect based on role
            if (user.role === 'admin') {
                // Admin login not really supported here, but handle just in case
                window.location.href = 'http://localhost:3001/admin';
            } else if (user.role === 'agent') {
                window.location.href = 'http://localhost:3001/agent';
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
            // STRICT Payload Construction for Backend
            // Fixed: Combining names, filtering out excluded fields
            const payload = {
                name: `${userData.firstName} ${userData.lastName}`,
                email: userData.email,
                password: userData.password,
                companyName: userData.companyName
            };

            const response = await api.post('/auth/register', payload);
            const { token: access_token, user } = response.data;
            // Normalize token key
            const finalToken = access_token || response.data.token;

            setToken(finalToken);
            setUser(user);

            localStorage.setItem('token', finalToken);
            localStorage.setItem('user', JSON.stringify(user));

            // Get current locale
            const currentPath = window.location.pathname;
            const segments = currentPath.split('/').filter(Boolean);
            const locale = segments[0] === 'en' || segments[0] === 'ru' ? segments[0] : 'he';

            // Force hard navigation to ensure state is fresh
            window.location.href = `/${locale}/dashboard`;
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/he');
    };

    const updateUser = (userData: Partial<User>) => {
        const updatedUser = { ...user, ...userData } as User;
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, updateUser, isLoading }}>
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
