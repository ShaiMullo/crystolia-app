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
    withCredentials: true, // Auth via HttpOnly cookie (auth_token) — set by backend on login
});

export default api;
