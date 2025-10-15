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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        setLoading(false);
        return;
      }
      
      if (!user) {
        console.log('No user found');
        setLoading(false);
        return;
      }

      console.log('Loading businesses for user:', user.id);

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

      if (error) {
        console.error('Error fetching business members:', error);
        throw error;
      }

      console.log('Memberships data:', memberships);

      // Extract businesses from memberships
      const businessList = memberships?.map((m: any) => m.businesses).filter(Boolean) || [];
      console.log('Business list:', businessList);
      
      setBusinesses(businessList);

      // Set current business from localStorage or first business
      const savedBusinessId = localStorage.getItem('currentBusinessId');
      let selectedBusiness = savedBusinessId 
        ? businessList.find((b: Business) => b.id === savedBusinessId)
        : businessList[0];

      if (!selectedBusiness && businessList.length > 0) {
        selectedBusiness = businessList[0];
      }

      console.log('Selected business:', selectedBusiness);

      if (selectedBusiness) {
        setCurrentBusiness(selectedBusiness);
        localStorage.setItem('currentBusinessId', selectedBusiness.id);

        // Get user role for current business
        const membership = memberships?.find((m: any) => m.business_id === selectedBusiness.id);
        console.log('User role:', membership?.role);
        setUserRole(membership?.role || null);
      } else {
        console.warn('No business found for user');
        setCurrentBusiness(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
      toast.error('Error al cargar los negocios');
    } finally {
      console.log('Finished loading businesses');
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