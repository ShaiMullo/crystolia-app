import axios from "axios";

// ===============================================
// 🔐 Cookie-Based Same-Origin API Client
// ===============================================
// All requests go to /api/*
// Next.js rewrites will proxy to backend.
// No Authorization headers.
// No localStorage.
// Cookie is HttpOnly.

const api = axios.create({
    baseURL: "/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

export default api;
