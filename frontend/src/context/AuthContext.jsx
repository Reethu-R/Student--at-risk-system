/**
 * context/AuthContext.jsx
 * Global auth state — JWT access token + refresh + user info
 * Axios interceptors auto-refresh tokens on 401
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Axios instance with interceptors
const api = axios.create({
  baseURL:          '/api',
  withCredentials:  true, // Send httpOnly cookie (refresh token)
});

let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]         = useState(null);
  const [token, setToken]       = useState(() => localStorage.getItem('accessToken'));
  const [loading, setLoading]   = useState(true);

  // Set auth header
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('accessToken', token);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('accessToken');
    }
  }, [token]);

  // Axios response interceptor — auto-refresh on 401
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (res) => res,
      async (err) => {
        const original = err.config;
        if (err.response?.status === 401 && !original._retry) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            }).then(newToken => {
              original.headers['Authorization'] = `Bearer ${newToken}`;
              return api(original);
            });
          }
          original._retry = true;
          isRefreshing    = true;
          try {
            const { data } = await axios.post('/api/auth/refresh-token', {}, { withCredentials: true });
            const newToken  = data.accessToken;
            setToken(newToken);
            processQueue(null, newToken);
            original.headers['Authorization'] = `Bearer ${newToken}`;
            return api(original);
          } catch (refreshErr) {
            processQueue(refreshErr, null);
            setUser(null);
            setToken(null);
            window.location.href = '/login';
            return Promise.reject(refreshErr);
          } finally {
            isRefreshing = false;
          }
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  // Init: restore user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedTok  = localStorage.getItem('accessToken');
    if (savedUser && savedTok) {
      setUser(JSON.parse(savedUser));
      setToken(savedTok);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    setToken(null);
    setUser(null);
    localStorage.clear();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export { api };
export default AuthContext;
