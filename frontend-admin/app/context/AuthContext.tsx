'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/app/lib/api';
import { useRouter } from 'next/navigation';
import { User } from '@/types';

interface LoginData {
    email: string;
    password: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (data: LoginData) => Promise<void>;
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
        // Initialize from localStorage
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem('user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (credentials: LoginData) => {
        try {
            const response = await api.post('/auth/login', credentials);

            // STRICT CONTRACT: Response is { token, user }
            const { token: access_token, user } = response.data;

            if (!user || !access_token) {
                console.error("Invalid API Response:", response.data);
                throw new Error('Invalid response from server');
            }

            if (user.role !== 'admin' && user.role !== 'agent') {
                throw new Error('Unauthorized: Invalid role');
            }

            setToken(access_token);
            setUser(user);

            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(user));

            // Role-Based Redirect
            if (user.role === 'admin') {
                router.push('/admin');
            } else if (user.role === 'agent') {
                router.push('/agent');
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
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
