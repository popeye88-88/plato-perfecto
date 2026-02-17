import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchUserByCredentials, fetchAllUsers, isSupabaseConfigured } from '@/lib/supabase';

export interface User {
  id: string;
  username: string;
  password: string;
  createdAt: Date;
}

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  getUsers: () => Promise<User[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const getUsers = useCallback(async (): Promise<User[]> => {
    if (isSupabaseConfigured()) {
      const users = await fetchAllUsers();
      return users.map((u) => ({ ...u, createdAt: u.createdAt }));
    }
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
      try {
        return JSON.parse(savedUsers).map((user: any) => ({
          ...user,
          createdAt: new Date(user.createdAt)
        }));
      } catch (error) {
        console.error('Error parsing users:', error);
        return [];
      }
    }
    return [];
  }, []);

  // Load current user from sessionStorage on mount
  useEffect(() => {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser({ ...user, createdAt: new Date(user.createdAt) });
      } catch (error) {
        console.error('Error parsing saved user:', error);
        sessionStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);

  // Initialize default users in localStorage if Supabase not configured
  useEffect(() => {
    if (isSupabaseConfigured()) return;
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) return;
    const defaultUsers: User[] = [
      { id: 'user1', username: 'user1', password: '1234', createdAt: new Date() },
      { id: 'user2', username: 'user2', password: '5678', createdAt: new Date() }
    ];
    localStorage.setItem('users', JSON.stringify(defaultUsers));
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
      const user = await fetchUserByCredentials(username, password);
      if (user) {
        const u = { ...user, createdAt: user.createdAt };
        setCurrentUser(u);
        sessionStorage.setItem('currentUser', JSON.stringify(u));
        return true;
      }
      return false;
    }
    const users = await getUsers();
    const user = users.find((u) => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('currentUser');
  };

  const value: AuthContextType = {
    currentUser,
    login,
    logout,
    isAuthenticated: !!currentUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
