import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await auth.getProfile();
      // Ensure we have the correct user data structure
      const userData = response.data.user || response.data;
      setUser({
        ...userData,
        _id: userData.id || userData._id, // Ensure we have _id for compatibility
      });
      setError(null);
    } catch (err) {
      console.error('Error loading user:', err);
      setError(err.response?.data?.message || 'Failed to load user');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await auth.login(credentials);
      localStorage.setItem('token', response.data.token);
      await loadUser();
      return response.data;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };

  const register = async (userData) => {
    try {
      const response = await auth.register(userData);
      localStorage.setItem('token', response.data.token);
      await loadUser();
      return response.data;
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
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

export default AuthContext; 