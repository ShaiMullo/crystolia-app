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
    profilePicture?: string;
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
            const { access_token, user } = response.data;

            setToken(access_token);
            setUser(user);

            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(user));

            // Redirect based on role
            if (user.role === 'admin') {
                router.push('/he/admin');
            } else if (user.role === 'secretary') {
                router.push('/he/secretary');
            } else {
                router.push('/he/dashboard');
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const register = async (userData: RegisterData) => {
        try {
            const response = await api.post('/auth/register', userData);
            const { access_token, user } = response.data;

            setToken(access_token);
            setUser(user);

            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(user));

            router.push('/he/dashboard');
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
