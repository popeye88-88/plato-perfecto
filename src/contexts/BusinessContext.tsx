import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Business {
  id: string;
  name: string;
  created_at: string;
}

interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: 'admin' | 'staff';
  business: Business;
}

interface BusinessContextType {
  currentBusiness: Business | null;
  businesses: Business[];
  userRole: 'admin' | 'staff' | null;
  loading: boolean;
  switchBusiness: (businessId: string) => void;
  refreshBusinesses: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const useBusinessContext = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusinessContext must be used within BusinessProvider');
  }
  return context;
};

export const BusinessProvider = ({ children }: { children: ReactNode }) => {
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'staff' | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBusinesses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get all businesses the user is a member of
      const { data: memberships, error } = await supabase
        .from('business_members')
        .select(`
          id,
          business_id,
          user_id,
          role,
          businesses (
            id,
            name,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const businessList = memberships?.map((m: any) => m.businesses) || [];
      setBusinesses(businessList);

      // Set current business from localStorage or first business
      const savedBusinessId = localStorage.getItem('currentBusinessId');
      let selectedBusiness = savedBusinessId 
        ? businessList.find((b: Business) => b.id === savedBusinessId)
        : businessList[0];

      if (!selectedBusiness && businessList.length > 0) {
        selectedBusiness = businessList[0];
      }

      if (selectedBusiness) {
        setCurrentBusiness(selectedBusiness);
        localStorage.setItem('currentBusinessId', selectedBusiness.id);

        // Get user role for current business
        const membership = memberships?.find((m: any) => m.business_id === selectedBusiness.id);
        setUserRole(membership?.role || null);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
      toast.error('Error al cargar los negocios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadBusinesses();
      } else if (event === 'SIGNED_OUT') {
        setCurrentBusiness(null);
        setBusinesses([]);
        setUserRole(null);
        localStorage.removeItem('currentBusinessId');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const switchBusiness = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      setCurrentBusiness(business);
      localStorage.setItem('currentBusinessId', businessId);
      
      // Update user role for new business
      supabase
        .from('business_members')
        .select('role')
        .eq('business_id', businessId)
        .single()
        .then(({ data }) => {
          if (data) setUserRole(data.role);
        });

      toast.success(`Cambiado a: ${business.name}`);
    }
  };

  const refreshBusinesses = async () => {
    await loadBusinesses();
  };

  return (
    <BusinessContext.Provider
      value={{
        currentBusiness,
        businesses,
        userRole,
        loading,
        switchBusiness,
        refreshBusinesses
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};