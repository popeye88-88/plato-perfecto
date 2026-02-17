import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

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

// Store which users have access to which businesses
interface BusinessUserAccess {
  businessId: string;
  userId: string;
}

interface BusinessContextType {
  currentBusiness: Business | null;
  businesses: Business[];
  setCurrentBusiness: (business: Business | null) => void;
  addBusiness: (business: Omit<Business, 'id' | 'createdAt'>) => void;
  updateBusiness: (id: string, updates: Partial<Business>) => void;
  deleteBusiness: (id: string) => void;
  shareBusinessWithUser: (businessId: string, userId: string) => void;
  getBusinessUsers: (businessId: string) => string[];
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
  const [loading, setLoading] = useState(true);

  // Get business-user access mappings
  const getBusinessAccess = (): BusinessUserAccess[] => {
    const saved = localStorage.getItem('businessUserAccess');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Error parsing business access:', error);
        return [];
      }
    }
    return [];
  };

  // Save business-user access mappings
  const saveBusinessAccess = (access: BusinessUserAccess[]) => {
    localStorage.setItem('businessUserAccess', JSON.stringify(access));
  };

  // Initialize default businesses and access for default users
  const initializeDefaultBusinesses = () => {
    // Create businesses for default users
    const business1: Business = {
      id: 'business-mi-restaurante',
      name: 'mi restaurante',
      description: 'Negocio de user1',
      createdAt: new Date(),
      menuItems: []
    };

    const business2: Business = {
      id: 'business-n1',
      name: 'N1',
      description: 'Negocio compartido',
      createdAt: new Date(),
      menuItems: []
    };

    const business3: Business = {
      id: 'business-n2',
      name: 'N2',
      description: 'Negocio de user2',
      createdAt: new Date(),
      menuItems: []
    };

    const newBusinesses = [business1, business2, business3];
    setAllBusinesses(newBusinesses);
    localStorage.setItem('businesses', JSON.stringify(newBusinesses));

    // Set up access: user1 -> mi restaurante, N1; user2 -> N1, N2
    const newAccess: BusinessUserAccess[] = [
      { businessId: 'business-mi-restaurante', userId: 'user1' },
      { businessId: 'business-n1', userId: 'user1' },
      { businessId: 'business-n1', userId: 'user2' },
      { businessId: 'business-n2', userId: 'user2' }
    ];
    
    // Merge with existing access (avoid duplicates)
    const existingAccess = getBusinessAccess();
    const mergedAccess = [...existingAccess];
    newAccess.forEach(newItem => {
      if (!mergedAccess.find(item => item.businessId === newItem.businessId && item.userId === newItem.userId)) {
        mergedAccess.push(newItem);
      }
    });
    saveBusinessAccess(mergedAccess);

    return newBusinesses;
  };

  // Load businesses and filter by current user
  useEffect(() => {
    if (currentUser) {
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

      // Initialize if needed
      if (allBusinessesData.length === 0) {
        allBusinessesData = initializeDefaultBusinesses();
      }
      setAllBusinesses(allBusinessesData);

      // Get user's accessible businesses
      const access = getBusinessAccess();
      const userBusinessIds = access
        .filter(a => a.userId === currentUser.id)
        .map(a => a.businessId);
      
      const userBusinesses = allBusinessesData.filter(b => userBusinessIds.includes(b.id));
      setBusinesses(userBusinesses);

      // Set current business if saved and accessible
      const savedCurrentBusiness = localStorage.getItem(`currentBusiness_${currentUser.id}`);
      if (savedCurrentBusiness) {
        try {
          const parsed = JSON.parse(savedCurrentBusiness);
          const found = userBusinesses.find(b => b.id === parsed.id);
          if (found) {
            setCurrentBusiness(found);
          } else if (userBusinesses.length > 0) {
            setCurrentBusiness(userBusinesses[0]);
          }
        } catch (error) {
          console.error('Error parsing current business:', error);
          if (userBusinesses.length > 0) {
            setCurrentBusiness(userBusinesses[0]);
          }
        }
      } else if (userBusinesses.length > 0) {
        setCurrentBusiness(userBusinesses[0]);
      }
    } else {
      setBusinesses([]);
      setCurrentBusiness(null);
    }
    
    setLoading(false);
  }, [currentUser]);

  // Save current business to localStorage when it changes (per user)
  useEffect(() => {
    if (currentBusiness && currentUser) {
      localStorage.setItem(`currentBusiness_${currentUser.id}`, JSON.stringify(currentBusiness));
    }
  }, [currentBusiness, currentUser]);

  // Save businesses to localStorage when they change
  useEffect(() => {
    if (allBusinesses.length > 0) {
      localStorage.setItem('businesses', JSON.stringify(allBusinesses));
    }
  }, [allBusinesses]);

  const addBusiness = (businessData: Omit<Business, 'id' | 'createdAt'>) => {
    if (!currentUser) return null;

    const newBusiness: Business = {
      ...businessData,
      id: `business-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };
    
    // Add to all businesses
    setAllBusinesses(prev => [...prev, newBusiness]);
    
    // Add access for current user
    const access = getBusinessAccess();
    access.push({ businessId: newBusiness.id, userId: currentUser.id });
    saveBusinessAccess(access);
    
    // Update user's businesses list
    setBusinesses(prev => [...prev, newBusiness]);
    
    return newBusiness;
  };

  const updateBusiness = (id: string, updates: Partial<Business>) => {
    // Update in all businesses
    setAllBusinesses(prev => prev.map(business => 
      business.id === id ? { ...business, ...updates } : business
    ));
    
    // Update in user's businesses
    setBusinesses(prev => prev.map(business => 
      business.id === id ? { ...business, ...updates } : business
    ));
    
    // Update current business if it's the one being updated
    if (currentBusiness?.id === id) {
      setCurrentBusiness(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteBusiness = (id: string) => {
    // Remove from all businesses
    setAllBusinesses(prev => prev.filter(business => business.id !== id));
    
    // Remove from user's businesses
    setBusinesses(prev => prev.filter(business => business.id !== id));
    
    // Remove all access entries for this business
    const access = getBusinessAccess();
    const filteredAccess = access.filter(a => a.businessId !== id);
    saveBusinessAccess(filteredAccess);
    
    // If current business is deleted, switch to first available business
    if (currentBusiness?.id === id) {
      const remainingBusinesses = businesses.filter(business => business.id !== id);
      if (remainingBusinesses.length > 0) {
        setCurrentBusiness(remainingBusinesses[0]);
      } else {
        setCurrentBusiness(null);
      }
    }
  };

  const shareBusinessWithUser = (businessId: string, userId: string) => {
    const access = getBusinessAccess();
    // Check if access already exists
    const exists = access.some(a => a.businessId === businessId && a.userId === userId);
    if (!exists) {
      access.push({ businessId, userId });
      saveBusinessAccess(access);
    }
  };

  const getBusinessUsers = (businessId: string): string[] => {
    const access = getBusinessAccess();
    return access
      .filter(a => a.businessId === businessId)
      .map(a => a.userId);
  };

  const value: BusinessContextType = {
    currentBusiness,
    businesses,
    setCurrentBusiness,
    addBusiness,
    updateBusiness,
    deleteBusiness,
    shareBusinessWithUser,
    getBusinessUsers,
    loading
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};