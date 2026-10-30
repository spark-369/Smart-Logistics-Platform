import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../services/authService';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../services/api';
import { UserRole } from '../constants';

const AuthContext = createContext(null);

/**
 * Reads the persisted session, tolerating corrupt JSON and legacy key names.
 * Returns null when there is no usable session.
 */
const readStoredSession = () => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const rawUser = localStorage.getItem(USER_STORAGE_KEY);
  if (!token || !rawUser) return null;

  try {
    const user = JSON.parse(rawUser);
    // A token without an id or role cannot be used for role gating.
    if (!user?.id || !user?.role) return null;
    return user;
  } catch {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore synchronously: there is no server round trip needed because the JWT carries
    // the identity, and an expired token is rejected by the API interceptor on first use.
    setUser(readStoredSession());
    setLoading(false);
  }, []);

  const persistSession = useCallback((data) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
    setUser(data);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await authService.login(email, password);
      persistSession(data);
      return data;
    },
    [persistSession],
  );

  const register = useCallback(
    async (userData) => {
      const data = await authService.register(userData);
      persistSession(data);
      return data;
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (roles) => {
      if (!user?.role) return false;
      return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      hasRole,
      isAdmin: () => hasRole(UserRole.ADMIN),
      isDispatcher: () => hasRole([UserRole.ADMIN, UserRole.DISPATCHER]),
      isDriver: () => hasRole([UserRole.ADMIN, UserRole.DRIVER]),
      isCustomer: () => hasRole([UserRole.ADMIN, UserRole.CUSTOMER, UserRole.DISPATCHER]),
    }),
    [user, loading, login, register, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return context;
};
