import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev && prev.id === toast?.id ? null : prev));
    }, 4500);
  };

  const closeToast = () => setToast(null);

  // Initialize auth state from localStorage and verify with backend
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('meetmind_token');
      const storedUser = localStorage.getItem('meetmind_user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verify session validity with backend /auth/me
          const freshUser = await authService.getProfile();
          setUser(freshUser);
          localStorage.setItem('meetmind_user', JSON.stringify(freshUser));
        } catch {
          // Token invalid or expired
          localStorage.removeItem('meetmind_token');
          localStorage.removeItem('meetmind_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();

    // Listen for custom logout event triggered by axios 401 interceptor
    const handleLogoutEvent = () => {
      setUser(null);
      setToken(null);
      showToast('Your session has expired. Please log in again.', 'info');
    };

    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, []);

  const login = async (email, password) => {
    const data = await authService.login({ email, password });
    localStorage.setItem('meetmind_token', data.access_token);
    localStorage.setItem('meetmind_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    showToast(data.message || 'Login Successful', 'success');
    return data;
  };

  const register = async (name, email, password, confirm_password) => {
    const data = await authService.register({
      name,
      email,
      password,
      confirm_password,
    });
    showToast(data.message || 'Account Created Successfully', 'success');
    return data;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('meetmind_token');
      localStorage.removeItem('meetmind_user');
      setUser(null);
      setToken(null);
      showToast('You have been logged out securely.', 'info');
    }
  };

  const updateProfile = async (profileData) => {
    const data = await authService.updateProfile(profileData);
    if (data.user) {
      setUser(data.user);
      localStorage.setItem('meetmind_user', JSON.stringify(data.user));
    }
    showToast(data.message || 'Profile updated successfully', 'success');
    return data;
  };

  const changePassword = async (passwordData) => {
    const data = await authService.changePassword(passwordData);
    showToast(data.message || 'Password changed successfully', 'success');
    return data;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    toast,
    showToast,
    closeToast,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
