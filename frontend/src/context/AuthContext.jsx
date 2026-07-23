import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { UserRole } from '../constants';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  const isAdmin = () => hasRole(UserRole.ADMIN);
  const isDispatcher = () => hasRole([UserRole.ADMIN, UserRole.DISPATCHER]);
  const isDriver = () => hasRole([UserRole.ADMIN, UserRole.DRIVER]);
  const isCustomer = () => hasRole([UserRole.ADMIN, UserRole.CUSTOMER, UserRole.DISPATCHER]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, hasRole, isAdmin, isDispatcher, isDriver, isCustomer }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
