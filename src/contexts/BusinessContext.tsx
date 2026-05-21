import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  language?: string;
  currency?: string;
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

export type BusinessRole = 'owner' | 'manager' | 'staff';
type DbRole = 'admin' | 'manager' | 'staff';

const dbToApp = (r: DbRole): BusinessRole => (r === 'admin' ? 'owner' : r === 'manager' ? 'manager' : 'staff');
const appToDb = (r: BusinessRole): DbRole => (r === 'owner' ? 'admin' : r === 'manager' ? 'manager' : 'staff');

interface BusinessUserAccess {
  businessId: string;
  userId: string;
  role: BusinessRole;
}

export interface RoleHistoryRow {
  id: string;
  business_id: string;
  changed_by: string;
  target_user_id: string;
  old_role: DbRole | null;
  new_role: DbRole;
  created_at: string;
}

export interface PendingInvitationRow {
  id: string;
  email: string;
  business_id: string;
  role: DbRole;
  invited_by: string;
  created_at: string;
  accepted_at: string | null;
}

interface BusinessContextType {
  currentBusiness: Business | null;
  businesses: Business[];
  setCurrentBusiness: (business: Business | null) => void;
  addBusiness: (business: Omit<Business, 'id' | 'createdAt'>) => Promise<Business | null>;
  updateBusiness: (id: string, updates: Partial<Business>) => void;
  deleteBusiness: (id: string) => void;
  shareBusinessWithUser: (businessId: string, userId: string, role: BusinessRole) => Promise<void>;
  removeBusinessMember: (businessId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  getBusinessUsers: (businessId: string) => string[];
  getBusinessUsersWithRoles: (businessId: string) => { userId: string; role: BusinessRole }[];
  getUserRole: (businessId: string, userId: string) => BusinessRole | undefined;
  hasNoBusinesses: boolean;
  reload: () => Promise<void>;
  addRoleHistory: (businessId: string, targetUserId: string, oldRole: BusinessRole | undefined, newRole: BusinessRole) => Promise<void>;
  fetchRoleHistory: (businessId: string) => Promise<RoleHistoryRow[]>;
  fetchPendingInvitations: (businessId: string) => Promise<PendingInvitationRow[]>;
  cancelInvitation: (invitationId: string) => Promise<void>;
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

  const load = useCallback(async () => {
    if (!currentUser) {
      setBusinesses([]);
      setCurrentBusiness(null);
      setAccess([]);
      setLoading(false);
      return;
    }
    try {
      // Parallelize memberships + businesses fetch
      const [membRes, businessesData] = await Promise.all([
        supabase.from('business_members').select('business_id, user_id, role'),
        fetchBusinessesDb(),
      ]);
      if (membRes.error) throw membRes.error;

      const accessData = (membRes.data || []).map((m) => ({
        businessId: m.business_id,
        userId: m.user_id,
        role: dbToApp(m.role as DbRole),
      }));
      setAccess(accessData);

      const userBusinessIds = accessData
        .filter((a) => a.userId === currentUser.id)
        .map((a) => a.businessId);
      const userBizData = (businessesData || []).filter((b) => userBusinessIds.includes(b.id));

      // Determine current business first; only fetch menu items for it now
      const savedCurrent = localStorage.getItem(`currentBusiness_${currentUser.id}`);
      const parsed = savedCurrent
        ? (() => { try { return JSON.parse(savedCurrent); } catch { return null; } })()
        : null;
      const activeBiz = userBizData.find((b) => b.id === parsed?.id) ?? userBizData[0] ?? null;

      // Set businesses immediately (without menu items) so UI can render
      const initial = userBizData.map((b) => ({ ...b, menuItems: [] as MenuItem[] }));
      setBusinesses(initial);
      setCurrentBusiness(activeBiz ? { ...activeBiz, menuItems: [] } : null);
      setLoading(false);

      // Load menu items for active business immediately
      if (activeBiz) {
        try {
          const items = await fetchMenuItems(activeBiz.id);
          setBusinesses((prev) => prev.map((b) => (b.id === activeBiz.id ? { ...b, menuItems: items || [] } : b)));
          setCurrentBusiness((prev) => (prev && prev.id === activeBiz.id ? { ...prev, menuItems: items || [] } : prev));
        } catch (e) {
          console.error('menu items load error:', e);
        }
      }

      // Lazy-load menu items for the remaining businesses in background
      const others = userBizData.filter((b) => b.id !== activeBiz?.id);
      Promise.all(
        others.map(async (b) => {
          try {
            const items = await fetchMenuItems(b.id);
            return { id: b.id, items: items || [] };
          } catch {
            return { id: b.id, items: [] };
          }
        })
      ).then((results) => {
        setBusinesses((prev) =>
          prev.map((b) => {
            const r = results.find((x) => x.id === b.id);
            return r ? { ...b, menuItems: r.items } : b;
          })
        );
      });
    } catch (error) {
      console.error('BusinessProvider load error:', error);
      setBusinesses([]);
      setCurrentBusiness(null);
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (currentBusiness && currentUser) {
      localStorage.setItem(`currentBusiness_${currentUser.id}`, JSON.stringify(currentBusiness));
    }
  }, [currentBusiness, currentUser]);

  const addBusiness = async (businessData: Omit<Business, 'id' | 'createdAt'>): Promise<Business | null> => {
    if (!currentUser) return null;
    const newBusiness: Business = {
      ...businessData,
      id: `business-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      createdAt: new Date(),
    };
    const inserted = await insertBusinessDb({ id: newBusiness.id, name: newBusiness.name, description: newBusiness.description });
    if (!inserted) return null;
    const { error: memErr } = await supabase.from('business_members').upsert(
      { business_id: newBusiness.id, user_id: currentUser.id, role: 'admin' as DbRole },
      { onConflict: 'business_id,user_id' }
    );
    if (memErr) console.error('add member error:', memErr);
    setAccess((prev) => [...prev, { businessId: newBusiness.id, userId: currentUser.id, role: 'owner' }]);
    setBusinesses((prev) => [...prev, newBusiness]);
    setCurrentBusiness(newBusiness);
    return newBusiness;
  };

  const updateBusiness = (id: string, updates: Partial<Business>) => {
    const dbUpdates: { name?: string; description?: string; enable_entregando_stage?: boolean; language?: string; currency?: string } = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.enableEntregandoStage !== undefined) dbUpdates.enable_entregando_stage = updates.enableEntregandoStage;
    if (updates.language !== undefined) dbUpdates.language = updates.language;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    if (Object.keys(dbUpdates).length > 0) updateBusinessDb(id, dbUpdates);
    const apply = (b: Business) => (b.id === id ? { ...b, ...updates } : b);
    setBusinesses((prev) => prev.map(apply));
    if (currentBusiness?.id === id) setCurrentBusiness((prev) => (prev ? { ...prev, ...updates } : null));
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

  const shareBusinessWithUser = async (businessId: string, userId: string, role: BusinessRole) => {
    const { error } = await supabase.from('business_members').upsert(
      { business_id: businessId, user_id: userId, role: appToDb(role) },
      { onConflict: 'business_id,user_id' }
    );
    if (error) throw error;
    setAccess((prev) => {
      const existing = prev.find((a) => a.businessId === businessId && a.userId === userId);
      if (existing) return prev.map((a) => (a === existing ? { ...a, role } : a));
      return [...prev, { businessId, userId, role }];
    });
  };

  const removeBusinessMember = async (businessId: string, userId: string) => {
    // Safeguard: cannot remove the only owner
    const members = access.filter((a) => a.businessId === businessId);
    const owners = members.filter((m) => m.role === 'owner');
    const target = members.find((m) => m.userId === userId);
    if (target?.role === 'owner' && owners.length <= 1) {
      return { success: false, error: 'No puedes eliminar al único propietario' };
    }
    const { error } = await supabase
      .from('business_members')
      .delete()
      .eq('business_id', businessId)
      .eq('user_id', userId);
    if (error) return { success: false, error: error.message };
    setAccess((prev) => prev.filter((a) => !(a.businessId === businessId && a.userId === userId)));
    return { success: true };
  };

  const getBusinessUsers = (businessId: string): string[] =>
    access.filter((a) => a.businessId === businessId).map((a) => a.userId);

  const getBusinessUsersWithRoles = (businessId: string): { userId: string; role: BusinessRole }[] =>
    access.filter((a) => a.businessId === businessId).map((a) => ({ userId: a.userId, role: a.role }));

  const getUserRole = (businessId: string, userId: string): BusinessRole | undefined =>
    access.find((a) => a.businessId === businessId && a.userId === userId)?.role;

  const addRoleHistory = async (
    businessId: string,
    targetUserId: string,
    oldRole: BusinessRole | undefined,
    newRole: BusinessRole
  ) => {
    if (!currentUser) return;
    const { error } = await supabase.from('role_history').insert({
      business_id: businessId,
      changed_by: currentUser.id,
      target_user_id: targetUserId,
      old_role: oldRole ? appToDb(oldRole) : null,
      new_role: appToDb(newRole),
    });
    if (error) console.error('role history insert error:', error);
  };

  const fetchRoleHistory = async (businessId: string): Promise<RoleHistoryRow[]> => {
    const { data, error } = await supabase
      .from('role_history')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      console.error('fetch role history error:', error);
      return [];
    }
    return (data ?? []) as RoleHistoryRow[];
  };

  const fetchPendingInvitations = async (businessId: string): Promise<PendingInvitationRow[]> => {
    const { data, error } = await supabase
      .from('pending_invitations')
      .select('*')
      .eq('business_id', businessId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('fetch invitations error:', error);
      return [];
    }
    return (data ?? []) as PendingInvitationRow[];
  };

  const cancelInvitation = async (invitationId: string) => {
    const { error } = await supabase.from('pending_invitations').delete().eq('id', invitationId);
    if (error) console.error('cancel invitation error:', error);
  };

  const value: BusinessContextType = {
    currentBusiness,
    businesses,
    setCurrentBusiness,
    addBusiness,
    updateBusiness,
    deleteBusiness,
    shareBusinessWithUser,
    removeBusinessMember,
    getBusinessUsers,
    getBusinessUsersWithRoles,
    getUserRole,
    hasNoBusinesses: !loading && businesses.length === 0,
    reload: load,
    addRoleHistory,
    fetchRoleHistory,
    fetchPendingInvitations,
    cancelInvitation,
    loading,
  };

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
};
