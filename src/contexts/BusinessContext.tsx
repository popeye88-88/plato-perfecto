import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

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

export type BusinessRole = 'admin' | 'staff';

interface BusinessMember {
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
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Load businesses for current user
  useEffect(() => {
    if (!currentUser) {
      setBusinesses([]);
      setCurrentBusiness(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        // Fetch businesses (RLS filters to user's businesses)
        const { data: businessesData, error: bizError } = await supabase
          .from('businesses')
          .select('*')
          .order('created_at', { ascending: true });

        if (bizError) {
          console.error('Error fetching businesses:', bizError);
          setLoading(false);
          return;
        }

        // Fetch business members
        const { data: membersData } = await supabase
          .from('business_members')
          .select('*');

        const membersList: BusinessMember[] = (membersData || []).map((m: any) => ({
          businessId: m.business_id,
          userId: m.user_id,
          role: m.role as BusinessRole
        }));
        setMembers(membersList);

        // Fetch menu items for each business
        const businessList: Business[] = [];
        for (const b of businessesData || []) {
          const { data: menuData } = await supabase
            .from('menu_items')
            .select('*')
            .eq('business_id', b.id)
            .order('name');

          const menuItems = (menuData || []).map((m: any) => ({
            id: m.id,
            name: m.name,
            price: parseFloat(m.price),
            category: m.category,
            description: m.description
          }));

          businessList.push({
            id: b.id,
            name: b.name,
            description: b.description,
            createdAt: new Date(b.created_at),
            menuItems
          });
        }

        setBusinesses(businessList);

        // Restore current business
        const savedCurrent = localStorage.getItem(`currentBusiness_${currentUser.id}`);
        const parsed = savedCurrent ? (() => { try { return JSON.parse(savedCurrent); } catch { return null; } })() : null;
        const found = businessList.find((b) => b.id === parsed?.id);
        setCurrentBusiness(found ?? businessList[0] ?? null);
      } catch (error) {
        console.error('Error loading businesses:', error);
      }
      setLoading(false);
    };
    load();
  }, [currentUser]);

  // Save current business to localStorage when it changes
  useEffect(() => {
    if (currentBusiness && currentUser) {
      localStorage.setItem(`currentBusiness_${currentUser.id}`, JSON.stringify({ id: currentBusiness.id }));
    }
  }, [currentBusiness, currentUser]);

  const addBusiness = async (businessData: Omit<Business, 'id' | 'createdAt'>) => {
    if (!currentUser) return null;

    const { data, error } = await supabase
      .from('businesses')
      .insert({ name: businessData.name, description: businessData.description || null })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating business:', error);
      return null;
    }

    // Add self as admin
    await supabase
      .from('business_members')
      .insert({ business_id: data.id, user_id: currentUser.id, role: 'admin' });

    const newBusiness: Business = {
      id: data.id,
      name: data.name,
      description: data.description,
      createdAt: new Date(data.created_at),
      menuItems: businessData.menuItems || []
    };

    setMembers((prev) => [...prev, { businessId: data.id, userId: currentUser.id, role: 'admin' }]);
    setBusinesses((prev) => [...prev, newBusiness]);
    return newBusiness;
  };

  const updateBusiness = async (id: string, updates: Partial<Business>) => {
    const { error } = await supabase
      .from('businesses')
      .update({ name: updates.name, description: updates.description })
      .eq('id', id);

    if (error) {
      console.error('Error updating business:', error);
      return;
    }

    const apply = (b: Business) => (b.id === id ? { ...b, ...updates } : b);
    setBusinesses((prev) => prev.map(apply));
    if (currentBusiness?.id === id) {
      setCurrentBusiness((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const deleteBusiness = async (id: string) => {
    const { error } = await supabase.from('businesses').delete().eq('id', id);
    if (error) {
      console.error('Error deleting business:', error);
      return;
    }

    setMembers((prev) => prev.filter((m) => m.businessId !== id));
    setBusinesses((prev) => prev.filter((b) => b.id !== id));
    if (currentBusiness?.id === id) {
      const remaining = businesses.filter((b) => b.id !== id);
      setCurrentBusiness(remaining[0] ?? null);
    }
  };

  const shareBusinessWithUser = async (businessId: string, userId: string, role: BusinessRole) => {
    const { error } = await supabase
      .from('business_members')
      .upsert(
        { business_id: businessId, user_id: userId, role },
        { onConflict: 'business_id,user_id' }
      );

    if (error) {
      console.error('Error sharing business:', error);
      return;
    }

    setMembers((prev) => {
      const existing = prev.find((m) => m.businessId === businessId && m.userId === userId);
      if (existing) return prev.map((m) => (m === existing ? { ...m, role } : m));
      return [...prev, { businessId, userId, role }];
    });
  };

  const getBusinessUsers = (businessId: string): string[] =>
    members.filter((m) => m.businessId === businessId).map((m) => m.userId);

  const getBusinessUsersWithRoles = (businessId: string): { userId: string; role: BusinessRole }[] =>
    members.filter((m) => m.businessId === businessId).map((m) => ({ userId: m.userId, role: m.role }));

  const getUserRole = (businessId: string, userId: string): BusinessRole | undefined =>
    members.find((m) => m.businessId === businessId && m.userId === userId)?.role;

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
