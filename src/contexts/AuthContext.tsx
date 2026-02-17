import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  username: string;
  password: string;
  createdAt: Date;
}

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
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

  // Load current user from sessionStorage on mount
  useEffect(() => {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        sessionStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);

  // Initialize default users if they don't exist
  useEffect(() => {
    const users = getUsers();
    if (users.length === 0) {
      initializeDefaultUsers();
    }
  }, []);

  const getUsers = (): User[] => {
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
  };

  const saveUsers = (users: User[]) => {
    localStorage.setItem('users', JSON.stringify(users));
  };

  const initializeDefaultUsers = () => {
    const defaultUsers: User[] = [
      {
        id: 'user1',
        username: 'user1',
        password: '1234',
        createdAt: new Date()
      },
      {
        id: 'user2',
        username: 'user2',
        password: '5678',
        createdAt: new Date()
      }
    ];
    saveUsers(defaultUsers);
  };

  const login = (username: string, password: string): boolean => {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    
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
