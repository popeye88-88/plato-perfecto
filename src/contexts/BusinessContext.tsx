import React, { createContext, useContext, useState, useEffect } from 'react';

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

interface BusinessContextType {
  currentBusiness: Business | null;
  businesses: Business[];
  setCurrentBusiness: (business: Business | null) => void;
  addBusiness: (business: Omit<Business, 'id' | 'createdAt'>) => void;
  updateBusiness: (id: string, updates: Partial<Business>) => void;
  deleteBusiness: (id: string) => void;
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
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  // Load businesses from localStorage
  useEffect(() => {
    const savedBusinesses = localStorage.getItem('businesses');
    const savedCurrentBusiness = localStorage.getItem('currentBusiness');
    
    if (savedBusinesses) {
      try {
        const parsedBusinesses = JSON.parse(savedBusinesses).map((business: any) => ({
          ...business,
          createdAt: new Date(business.createdAt)
        }));
        setBusinesses(parsedBusinesses);
        
        // Set current business if saved
        if (savedCurrentBusiness) {
          const parsedCurrentBusiness = JSON.parse(savedCurrentBusiness);
          const foundBusiness = parsedBusinesses.find((b: Business) => b.id === parsedCurrentBusiness.id);
          if (foundBusiness) {
            setCurrentBusiness(foundBusiness);
          }
        }
      } catch (error) {
        console.error('Error parsing saved businesses:', error);
      }
    } else {
      // Create default business if none exist
      const defaultBusiness: Business = {
        id: 'default-business',
        name: 'Mi Restaurante',
        description: 'Negocio principal',
        createdAt: new Date(),
        menuItems: [
          { id: '1', name: 'Pizza Margherita', price: 15.00, category: 'Pizzas' },
          { id: '2', name: 'Hamburguesa Clásica', price: 12.50, category: 'Hamburguesas' },
          { id: '3', name: 'Pasta Carbonara', price: 14.00, category: 'Pastas' },
          { id: '4', name: 'Ensalada César', price: 10.00, category: 'Ensaladas' },
        ]
      };
      
      setBusinesses([defaultBusiness]);
      setCurrentBusiness(defaultBusiness);
      localStorage.setItem('businesses', JSON.stringify([defaultBusiness]));
      localStorage.setItem('currentBusiness', JSON.stringify(defaultBusiness));
    }
    
    setLoading(false);
  }, []);

  // Save current business to localStorage when it changes
  useEffect(() => {
    if (currentBusiness) {
      localStorage.setItem('currentBusiness', JSON.stringify(currentBusiness));
    }
  }, [currentBusiness]);

  // Save businesses to localStorage when they change
  useEffect(() => {
    if (businesses.length > 0) {
      localStorage.setItem('businesses', JSON.stringify(businesses));
    }
  }, [businesses]);

  const addBusiness = (businessData: Omit<Business, 'id' | 'createdAt'>) => {
    const newBusiness: Business = {
      ...businessData,
      id: `business-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };
    
    setBusinesses(prev => [...prev, newBusiness]);
    return newBusiness;
  };

  const updateBusiness = (id: string, updates: Partial<Business>) => {
    setBusinesses(prev => prev.map(business => 
      business.id === id ? { ...business, ...updates } : business
    ));
    
    // Update current business if it's the one being updated
    if (currentBusiness?.id === id) {
      setCurrentBusiness(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteBusiness = (id: string) => {
    setBusinesses(prev => prev.filter(business => business.id !== id));
    
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

  const value: BusinessContextType = {
    currentBusiness,
    businesses,
    setCurrentBusiness,
    addBusiness,
    updateBusiness,
    deleteBusiness,
    loading
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};