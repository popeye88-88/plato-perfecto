import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface Business {
  id: string;
  name: string;
}

interface BusinessContextValue {
  businesses: Business[];
  selectedBusinessId: string | null;
  selectedBusiness: Business | null;
  setSelectedBusinessId: (id: string) => void;
  addBusiness: (business: Business) => void;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

const BUSINESSES_KEY = 'pp_businesses_v1';
const SELECTED_KEY = 'pp_selected_business_v1';

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore persistence errors
  }
}

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>(() => readLocal<Business[]>(BUSINESSES_KEY, []));
  const [selectedBusinessId, setSelectedBusinessIdState] = useState<string | null>(() => readLocal<string | null>(SELECTED_KEY, null));

  // Ensure at least one business exists; create a default if none
  useEffect(() => {
    if (businesses.length === 0) {
      const defaultBusiness: Business = { id: 'default', name: 'Mi Negocio' };
      setBusinesses([defaultBusiness]);
      setSelectedBusinessIdState(defaultBusiness.id);
      writeLocal(BUSINESSES_KEY, [defaultBusiness]);
      writeLocal(SELECTED_KEY, defaultBusiness.id);
    }
  }, [businesses.length]);

  // Persist changes
  useEffect(() => {
    writeLocal(BUSINESSES_KEY, businesses);
  }, [businesses]);

  useEffect(() => {
    writeLocal(SELECTED_KEY, selectedBusinessId);
  }, [selectedBusinessId]);

  const setSelectedBusinessId = useCallback((id: string) => {
    setSelectedBusinessIdState(id);
  }, []);

  const addBusiness = useCallback((business: Business) => {
    setBusinesses(prev => {
      const next = [...prev, business];
      return next;
    });
    setSelectedBusinessIdState(business.id);
  }, []);

  const selectedBusiness = useMemo(() => {
    return businesses.find(b => b.id === selectedBusinessId) ?? null;
  }, [businesses, selectedBusinessId]);

  const value = useMemo<BusinessContextValue>(() => ({
    businesses,
    selectedBusinessId,
    selectedBusiness,
    setSelectedBusinessId,
    addBusiness,
  }), [businesses, selectedBusinessId, selectedBusiness, setSelectedBusinessId, addBusiness]);

  return (
    <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
  );
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return ctx;
}


