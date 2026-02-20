'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation';
import api from '@/app/lib/api';

interface User {
    _id: string
    name: string
    email: string
    role: string
}

interface AuthContextType {
    user: User | null
    isLoading: boolean
    login: (user: User) => void
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter();
    const pathname = usePathname();

    const checkAuth = async () => {
        try {
            // Cookie is sent automatically
            const res = await api.get('/auth/me');
            setUser(res.data.user);
        } catch (error) {
            // Quietly fail context check
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (user: User) => {
        // Token is in HttpOnly cookie. We just update state.
        setUser(user);

        // Redirect based on role
        if (user.role === 'agent') {
            router.push('/agent');
        } else {
            router.push('/admin');
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error("Logout error", err);
        } finally {
            setUser(null);
            router.push('/login');
        }
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

