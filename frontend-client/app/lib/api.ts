import axios from 'axios';

// Get base URL - env var should already include /api
// Get base URL - Use relative path in browser to leverage Next.js rewrites
const getBaseUrl = () => {
    if (typeof window === 'undefined') {
        // Server-side: Use Docker internal network
        return process.env.BACKEND_URL || 'http://backend:4000/api';
    }
    // Client-side: Use relative path to hit Next.js proxy (http://localhost:3000/api)
    return '/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Send cookies with requests
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
