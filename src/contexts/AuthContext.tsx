import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
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

  const mapSessionUser = useCallback((authUser: { id: string; email?: string; user_metadata?: any; created_at?: string }): User => {
    return {
      id: authUser.id,
      username: authUser.user_metadata?.full_name || authUser.email || '',
      email: authUser.email || '',
      createdAt: authUser.created_at ? new Date(authUser.created_at) : new Date(),
    };
  }, []);

  // Listen for auth state changes - set up BEFORE getSession
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(mapSessionUser(session.user));
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(mapSessionUser(session.user));
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [mapSessionUser]);

  const getUsers = useCallback(async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, created_at');
    if (error || !data) return [];
    return data.map((p) => ({
      id: p.id,
      username: p.full_name || '',
      email: '',
      createdAt: new Date(p.created_at),
    }));
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const signup = async (email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const value: AuthContextType = {
    currentUser,
    login,
    signup,
    logout,
    isAuthenticated: !!currentUser,
    loading,
    getUsers,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
