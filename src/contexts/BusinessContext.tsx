import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchBusinesses as fetchBusinessesDb,
  insertBusiness as insertBusinessDb,
  updateBusinessDb,
  deleteBusinessDb,
  fetchMenuItems
} from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';

interface Business {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  enableEntregandoStage?: boolean;
  menuItems: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  hasSizes: boolean;
  sizes?: { id: string; name: string; price: number }[];
  color?: string;
  colorStyle?: 'fill' | 'border';
}

export type BusinessRole = 'owner' | 'staff';

interface BusinessUserAccess {
  businessId: string;
  userId: string;
  role: BusinessRole;
}

interface BusinessContextType {
  currentBusiness: Business | null;
  businesses: Business[];
  setCurrentBusiness: (business: Business | null) => void;
  addBusiness: (business: Omit<Business, 'id' | 'createdAt'>) => void;
  updateBusiness: (id: string, updates: Partial<Business>) => void;
  deleteBusiness: (id: string) => void;
  shareBusinessWithUser: (businessId: string, userId: string, role: BusinessRole) => void;
  getBusinessUsers: (businessId: string) => string[];
  getBusinessUsersWithRoles: (businessId: string) => { userId: string; role: BusinessRole }[];
  getUserRole: (businessId: string, userId: string) => BusinessRole | undefined;
  loading: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const useBusinessContext = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusinessContext must be used within a BusinessProvider');
  }
  return context;
};

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [access, setAccess] = useState<BusinessUserAccess[]>([]);
  const [loading, setLoading] = useState(true);

  // Load businesses from Supabase, filtered by RLS via business_members
  useEffect(() => {
    if (!currentUser) {
      setBusinesses([]);
      setCurrentBusiness(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const { data: memberships, error: membErr } = await supabase
          .from('business_members')
          .select('business_id, user_id, role');

        if (membErr) throw membErr;

        const accessData = (memberships || []).map((m) => ({
          businessId: m.business_id,
          userId: m.user_id,
          role: (m.role === 'admin' ? 'owner' : 'staff') as BusinessRole,
        }));
        setAccess(accessData);

        const businessesData = await fetchBusinessesDb();
        const userBusinessIds = accessData
          .filter((a) => a.userId === currentUser!.id)
          .map((a) => a.businessId);
        const userBizData = (businessesData || []).filter((b) =>
          userBusinessIds.includes(b.id)
        );

        const withMenuItems = await Promise.all(
          userBizData.map(async (b) => {
            try {
              const items = await fetchMenuItems(b.id);
              return { ...b, menuItems: items || [] };
            } catch {
              return { ...b, menuItems: [] };
            }
          })
        );

        setBusinesses(withMenuItems);

        const savedCurrent = localStorage.getItem(`currentBusiness_${currentUser!.id}`);
        const parsed = savedCurrent
          ? (() => { try { return JSON.parse(savedCurrent); } catch { return null; } })()
          : null;
        const found = withMenuItems.find((b) => b.id === parsed?.id);
        setCurrentBusiness(found ?? withMenuItems[0] ?? null);
      } catch (error) {
        console.error('BusinessProvider load error:', error);
        setBusinesses([]);
        setCurrentBusiness(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  // Persist current business selection per user (UI preference only)
  useEffect(() => {
    if (currentBusiness && currentUser) {
      localStorage.setItem(`currentBusiness_${currentUser.id}`, JSON.stringify(currentBusiness));
    }
  }, [currentBusiness, currentUser]);

  const addBusiness = (businessData: Omit<Business, 'id' | 'createdAt'>) => {
    if (!currentUser) return null;
    const newBusiness: Business = {
      ...businessData,
      id: `business-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      createdAt: new Date()
    };
    const newAccess = { businessId: newBusiness.id, userId: currentUser.id, role: 'owner' as BusinessRole };
    insertBusinessDb({ id: newBusiness.id, name: newBusiness.name, description: newBusiness.description });
    supabase.from('business_members').upsert(
      { business_id: newBusiness.id, user_id: currentUser.id, role: 'admin' as const },
      { onConflict: 'business_id,user_id' }
    );
    setAccess((prev) => [...prev, newAccess]);
    setBusinesses((prev) => [...prev, newBusiness]);
    return newBusiness;
  };

  const updateBusiness = (id: string, updates: Partial<Business>) => {
    const dbUpdates: { name?: string; description?: string; enable_entregando_stage?: boolean } = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.enableEntregandoStage !== undefined) dbUpdates.enable_entregando_stage = updates.enableEntregandoStage;
    if (Object.keys(dbUpdates).length > 0) {
      updateBusinessDb(id, dbUpdates);
    }
    const apply = (b: Business) => (b.id === id ? { ...b, ...updates } : b);
    setBusinesses((prev) => prev.map(apply));
    if (currentBusiness?.id === id) {
      setCurrentBusiness((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const deleteBusiness = (id: string) => {
    supabase.from('business_members').delete().eq('business_id', id);
    deleteBusinessDb(id);
    setAccess((prev) => prev.filter((a) => a.businessId !== id));
    setBusinesses((prev) => prev.filter((b) => b.id !== id));
    if (currentBusiness?.id === id) {
      const remaining = businesses.filter((b) => b.id !== id);
      setCurrentBusiness(remaining[0] ?? null);
    }
  };

  const shareBusinessWithUser = (businessId: string, userId: string, role: BusinessRole) => {
    const supaRole = role === 'owner' ? 'admin' : 'staff';
    supabase.from('business_members').upsert(
      { business_id: businessId, user_id: userId, role: supaRole as 'admin' | 'staff' },
      { onConflict: 'business_id,user_id' }
    );
    setAccess((prev) => {
      const existing = prev.find((a) => a.businessId === businessId && a.userId === userId);
      if (existing) return prev.map((a) => (a === existing ? { ...a, role } : a));
      return [...prev, { businessId, userId, role }];
    });
  };

  const getBusinessUsers = (businessId: string): string[] =>
    access.filter((a) => a.businessId === businessId).map((a) => a.userId);

  const getBusinessUsersWithRoles = (businessId: string): { userId: string; role: BusinessRole }[] =>
    access.filter((a) => a.businessId === businessId).map((a) => ({ userId: a.userId, role: a.role }));

  const getUserRole = (businessId: string, userId: string): BusinessRole | undefined =>
    access.find((a) => a.businessId === businessId && a.userId === userId)?.role;

  const value: BusinessContextType = {
    currentBusiness,
    businesses,
    setCurrentBusiness,
    addBusiness,
    updateBusiness,
    deleteBusiness,
    shareBusinessWithUser,
    getBusinessUsers,
    getBusinessUsersWithRoles,
    getUserRole,
    loading
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};
