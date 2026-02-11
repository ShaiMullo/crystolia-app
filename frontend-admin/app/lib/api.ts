import axios from 'axios';

// Get base URL - env var should already include /api
const getBaseUrl = () => {
    if (typeof window === 'undefined') {
        // Server-side: Must use Docker network DNS
        return process.env.BACKEND_URL || 'http://backend:4000/api';
    }
    // Client-side: Must use relative path to usage Next.js Rewrites
    return '/api';
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
