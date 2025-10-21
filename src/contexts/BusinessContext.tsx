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
  const [loading, setLoading] = useState(false);

  // Initialize with default business if none exist
  useEffect(() => {
    const savedBusinesses = localStorage.getItem('businesses');
    const savedCurrentBusiness = localStorage.getItem('currentBusiness');
    
    if (savedBusinesses) {
      try {
        const parsedBusinesses = JSON.parse(savedBusinesses);
        setBusinesses(parsedBusinesses);
        
        if (savedCurrentBusiness) {
          const parsedCurrentBusiness = JSON.parse(savedCurrentBusiness);
          setCurrentBusiness(parsedCurrentBusiness);
        } else if (parsedBusinesses.length > 0) {
          setCurrentBusiness(parsedBusinesses[0]);
        }
      } catch (error) {
        console.error('Error parsing saved businesses:', error);
        // Create default business
        const defaultBusiness: Business = {
          id: 'default-1',
          name: 'Mi Restaurante',
          createdAt: new Date(),
          menuItems: [
            { id: '1', name: 'Pizza Margherita', price: 15.00, category: 'Pizzas', description: 'Tomate, mozzarella y albahaca fresca' },
            { id: '2', name: 'Hamburguesa Clásica', price: 12.50, category: 'Hamburguesas', description: 'Carne, lechuga, tomate y queso' },
            { id: '3', name: 'Pasta Carbonara', price: 14.00, category: 'Pastas', description: 'Pasta con panceta, huevo y parmesano' },
          ]
        };
        setBusinesses([defaultBusiness]);
        setCurrentBusiness(defaultBusiness);
        localStorage.setItem('businesses', JSON.stringify([defaultBusiness]));
        localStorage.setItem('currentBusiness', JSON.stringify(defaultBusiness));
      }
    } else {
      // Create default business
      const defaultBusiness: Business = {
        id: 'default-1',
        name: 'Mi Restaurante',
        createdAt: new Date(),
        menuItems: [
          { id: '1', name: 'Pizza Margherita', price: 15.00, category: 'Pizzas', description: 'Tomate, mozzarella y albahaca fresca' },
          { id: '2', name: 'Hamburguesa Clásica', price: 12.50, category: 'Hamburguesas', description: 'Carne, lechuga, tomate y queso' },
          { id: '3', name: 'Pasta Carbonara', price: 14.00, category: 'Pastas', description: 'Pasta con panceta, huevo y parmesano' },
        ]
      };
      setBusinesses([defaultBusiness]);
      setCurrentBusiness(defaultBusiness);
      localStorage.setItem('businesses', JSON.stringify([defaultBusiness]));
      localStorage.setItem('currentBusiness', JSON.stringify(defaultBusiness));
    }
  }, []);

  const addBusiness = (business: Omit<Business, 'id' | 'createdAt'>) => {
    const newBusiness: Business = {
      ...business,
      id: `business-${Date.now()}`,
      createdAt: new Date(),
    };
    const updatedBusinesses = [...businesses, newBusiness];
    setBusinesses(updatedBusinesses);
    localStorage.setItem('businesses', JSON.stringify(updatedBusinesses));
  };

  const updateBusiness = (id: string, updates: Partial<Business>) => {
    const updatedBusinesses = businesses.map(business =>
      business.id === id ? { ...business, ...updates } : business
    );
    setBusinesses(updatedBusinesses);
    localStorage.setItem('businesses', JSON.stringify(updatedBusinesses));
    
    if (currentBusiness?.id === id) {
      const updatedCurrentBusiness = { ...currentBusiness, ...updates };
      setCurrentBusiness(updatedCurrentBusiness);
      localStorage.setItem('currentBusiness', JSON.stringify(updatedCurrentBusiness));
    }
  };

  const deleteBusiness = (id: string) => {
    if (businesses.length <= 1) return; // Don't delete the last business
    
    const updatedBusinesses = businesses.filter(business => business.id !== id);
    setBusinesses(updatedBusinesses);
    localStorage.setItem('businesses', JSON.stringify(updatedBusinesses));
    
    if (currentBusiness?.id === id) {
      const newCurrentBusiness = updatedBusinesses[0];
      setCurrentBusiness(newCurrentBusiness);
      localStorage.setItem('currentBusiness', JSON.stringify(newCurrentBusiness));
    }
  };

  const value: BusinessContextType = {
    currentBusiness,
    businesses,
    setCurrentBusiness,
    addBusiness,
    updateBusiness,
    deleteBusiness,
    loading,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};