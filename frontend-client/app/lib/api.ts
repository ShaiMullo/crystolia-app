import axios from 'axios';

// Get base URL - env var should already include /api
const getBaseUrl = () => {
    if (typeof window !== 'undefined' && (window as any).__ENV?.API_URL) {
        return (window as any).__ENV.API_URL;
    }
    if (typeof window === 'undefined') {
        return process.env.BACKEND_URL || 'http://127.0.0.1:4000/api';
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
