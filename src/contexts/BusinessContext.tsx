import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  isSupabaseConfigured,
  fetchBusinesses as fetchBusinessesDb,
  fetchBusinessAccess,
  insertBusiness as insertBusinessDb,
  updateBusinessDb,
  deleteBusinessDb,
  upsertBusinessAccess,
  deleteBusinessAccess,
  fetchMenuItems
} from '@/lib/supabase';

interface Business {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  menuItems: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
}

export type BusinessRole = 'owner' | 'staff';

// Store which users have access to which businesses and their role
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
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [access, setAccess] = useState<BusinessUserAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const getBusinessAccessLocal = useCallback((): BusinessUserAccess[] => {
    const saved = localStorage.getItem('businessUserAccess');
    if (saved) {
      try {
        const parsed: BusinessUserAccess[] = JSON.parse(saved);
        return parsed.map((a) => ({ ...a, role: a.role || 'staff' }));
      } catch (error) {
        console.error('Error parsing business access:', error);
        return [];
      }
    }
    return [];
  }, []);

  const saveBusinessAccessLocal = useCallback((access: BusinessUserAccess[]) => {
    localStorage.setItem('businessUserAccess', JSON.stringify(access));
  }, []);

  const ensureDefaultBusinessesLocal = useCallback((): Business[] => {
    const savedBusinesses = localStorage.getItem('businesses');
    let allBusinessesData: Business[] = [];
    if (savedBusinesses) {
      try {
        allBusinessesData = JSON.parse(savedBusinesses).map((business: any) => ({
          ...business,
          createdAt: new Date(business.createdAt)
        }));
      } catch (error) {
        console.error('Error parsing saved businesses:', error);
      }
    }
    const defaultBusinesses: Business[] = [
      { id: 'business-mi-restaurante', name: 'mi restaurante', description: 'Negocio de user1', createdAt: new Date(), menuItems: [] },
      { id: 'business-n1', name: 'N1', description: 'Negocio compartido', createdAt: new Date(), menuItems: [] },
      { id: 'business-n2', name: 'N2', description: 'Negocio de user2', createdAt: new Date(), menuItems: [] }
    ];
    const mergedBusinesses = [...allBusinessesData];
    defaultBusinesses.forEach((defaultBusiness) => {
      if (!mergedBusinesses.find((b) => b.id === defaultBusiness.id)) {
        mergedBusinesses.push(defaultBusiness);
      }
    });
    if (mergedBusinesses.length !== allBusinessesData.length) {
      localStorage.setItem('businesses', JSON.stringify(mergedBusinesses));
    }
    return mergedBusinesses;
  }, []);

  const ensureDefaultAccessLocal = useCallback(() => {
    const access = getBusinessAccessLocal();
    const requiredAccess: BusinessUserAccess[] = [
      { businessId: 'business-mi-restaurante', userId: 'user1', role: 'owner' },
      { businessId: 'business-n1', userId: 'user1', role: 'owner' },
      { businessId: 'business-n1', userId: 'user2', role: 'staff' },
      { businessId: 'business-n2', userId: 'user2', role: 'owner' }
    ];
    let hasChanges = false;
    requiredAccess.forEach((required) => {
      const existing = access.find((a) => a.businessId === required.businessId && a.userId === required.userId);
      if (!existing) {
        access.push(required);
        hasChanges = true;
      } else if (existing.role !== required.role) {
        existing.role = required.role;
        hasChanges = true;
      }
    });
    if (hasChanges) saveBusinessAccessLocal(access);
  }, [getBusinessAccessLocal, saveBusinessAccessLocal]);

  // Load businesses and filter by current user
  useEffect(() => {
    if (!currentUser) {
      setBusinesses([]);
      setCurrentBusiness(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      if (isSupabaseConfigured()) {
        const [businessesData, accessData] = await Promise.all([fetchBusinessesDb(), fetchBusinessAccess()]);
        setAccess(accessData.map((a) => ({ businessId: a.businessId, userId: a.userId, role: a.role })));
        const userBusinessIds = accessData.filter((a) => a.userId === currentUser.id).map((a) => a.businessId);
        const userBizData = businessesData.filter((b) => userBusinessIds.includes(b.id));
        const withMenuItems = await Promise.all(
          userBizData.map(async (b) => {
            const items = await fetchMenuItems(b.id);
            return { ...b, menuItems: items };
          })
        );
        setAllBusinesses(withMenuItems);
        setBusinesses(withMenuItems);
        const savedCurrent = localStorage.getItem(`currentBusiness_${currentUser.id}`);
        const parsed = savedCurrent ? (() => { try { return JSON.parse(savedCurrent); } catch { return null; } })() : null;
        const found = withMenuItems.find((b) => b.id === parsed?.id);
        setCurrentBusiness(found ?? withMenuItems[0] ?? null);
      } else {
        const allBusinessesData = ensureDefaultBusinessesLocal();
        ensureDefaultAccessLocal();
        const accessLocal = getBusinessAccessLocal();
        setAccess(accessLocal);
        const userBusinessIds = accessLocal.filter((a) => a.userId === currentUser.id).map((a) => a.businessId);
        const userBusinesses = allBusinessesData.filter((b) => userBusinessIds.includes(b.id));
        setAllBusinesses(allBusinessesData);
        setBusinesses(userBusinesses);
        const savedCurrentBusiness = localStorage.getItem(`currentBusiness_${currentUser.id}`);
        if (savedCurrentBusiness) {
          try {
            const parsed = JSON.parse(savedCurrentBusiness);
            const found = userBusinesses.find((b) => b.id === parsed.id);
            setCurrentBusiness(found ?? userBusinesses[0] ?? null);
          } catch {
            setCurrentBusiness(userBusinesses[0] ?? null);
          }
        } else {
          setCurrentBusiness(userBusinesses[0] ?? null);
        }
      }
      setLoading(false);
    };
    load();
  }, [currentUser, ensureDefaultBusinessesLocal, ensureDefaultAccessLocal, getBusinessAccessLocal]);

  // Save current business to localStorage when it changes (per user)
  useEffect(() => {
    if (currentBusiness && currentUser) {
      localStorage.setItem(`currentBusiness_${currentUser.id}`, JSON.stringify(currentBusiness));
    }
  }, [currentBusiness, currentUser]);

  useEffect(() => {
    if (!isSupabaseConfigured() && allBusinesses.length > 0) {
      localStorage.setItem('businesses', JSON.stringify(allBusinesses));
    }
  }, [allBusinesses]);

  const getAccess = useCallback(async (): Promise<BusinessUserAccess[]> => {
    if (isSupabaseConfigured()) {
      const data = await fetchBusinessAccess();
      return data.map((a) => ({ businessId: a.businessId, userId: a.userId, role: a.role }));
    }
    return getBusinessAccessLocal();
  }, [getBusinessAccessLocal]);

  const addBusiness = (businessData: Omit<Business, 'id' | 'createdAt'>) => {
    if (!currentUser) return null;
    const newBusiness: Business = {
      ...businessData,
      id: `business-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      createdAt: new Date()
    };
    const newAccess = { businessId: newBusiness.id, userId: currentUser.id, role: 'owner' as BusinessRole };
    if (isSupabaseConfigured()) {
      insertBusinessDb({ id: newBusiness.id, name: newBusiness.name, description: newBusiness.description });
      upsertBusinessAccess(newBusiness.id, currentUser.id, 'owner');
    } else {
      const accessLocal = getBusinessAccessLocal();
      accessLocal.push(newAccess);
      saveBusinessAccessLocal(accessLocal);
    }
    setAccess((prev) => [...prev, newAccess]);
    setAllBusinesses((prev) => [...prev, newBusiness]);
    setBusinesses((prev) => [...prev, newBusiness]);
    return newBusiness;
  };

  const updateBusiness = (id: string, updates: Partial<Business>) => {
    if (isSupabaseConfigured()) {
      updateBusinessDb(id, { name: updates.name, description: updates.description });
    }
    const apply = (b: Business) => (b.id === id ? { ...b, ...updates } : b);
    setAllBusinesses((prev) => prev.map(apply));
    setBusinesses((prev) => prev.map(apply));
    if (currentBusiness?.id === id) {
      setCurrentBusiness((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const deleteBusiness = (id: string) => {
    if (isSupabaseConfigured()) {
      deleteBusinessAccess(id);
      deleteBusinessDb(id);
    } else {
      const accessLocal = getBusinessAccessLocal();
      const filtered = accessLocal.filter((a) => a.businessId !== id);
      saveBusinessAccessLocal(filtered);
    }
    setAccess((prev) => prev.filter((a) => a.businessId !== id));
    setAllBusinesses((prev) => prev.filter((b) => b.id !== id));
    setBusinesses((prev) => prev.filter((b) => b.id !== id));
    if (currentBusiness?.id === id) {
      const remaining = businesses.filter((b) => b.id !== id);
      setCurrentBusiness(remaining[0] ?? null);
    }
  };

  const shareBusinessWithUser = (businessId: string, userId: string, role: BusinessRole) => {
    if (isSupabaseConfigured()) {
      upsertBusinessAccess(businessId, userId, role);
      setAccess((prev) => {
        const existing = prev.find((a) => a.businessId === businessId && a.userId === userId);
        if (existing) return prev.map((a) => (a === existing ? { ...a, role } : a));
        return [...prev, { businessId, userId, role }];
      });
    } else {
      const accessLocal = getBusinessAccessLocal();
      const existing = accessLocal.find((a) => a.businessId === businessId && a.userId === userId);
      if (existing) existing.role = role;
      else accessLocal.push({ businessId, userId, role });
      saveBusinessAccessLocal(accessLocal);
      setAccess([...accessLocal]);
    }
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