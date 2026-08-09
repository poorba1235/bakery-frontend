import axios from 'axios';

const api = axios.create({
    baseURL: 'http://79.143.176.33:8005/api',
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const REPORTS_URL = 'http://79.143.176.33:8005/api/reports';

export default api;
