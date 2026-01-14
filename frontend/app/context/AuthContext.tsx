'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { useRouter } from 'next/navigation';

interface User {
    _id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (data: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check for token on mount
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (credentials: any) => {
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

    const register = async (userData: any) => {
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

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
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
